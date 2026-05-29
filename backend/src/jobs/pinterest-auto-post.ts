/**
 * Pinterest auto-post job — posts top-rated products from the DB as Pinterest Pins.
 *
 * Product source: existing DB products (no Amazon API required).
 * Selects unposted products: rating ≥ PINTEREST_MIN_RATING, price > 0, has image + affiliate URL.
 * Rotates randomly each run so same products don't always appear first.
 *
 * Tracker: backend/.pinterest-posted.json (same pattern as .telegram-posted.json)
 *
 * Env vars (all optional with defaults):
 *   PINTEREST_PINS_PER_RUN  — pins to post per run (default 3, max 10)
 *   PINTEREST_MIN_RATING    — minimum product rating (default 4.0)
 *   PINTEREST_BOARD_ID      — target board ID (required)
 *   PINTEREST_ACCESS_TOKEN  — Bearer token (required)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { and, desc, eq, gte, notInArray, sql } from "drizzle-orm";
import { db } from "../lib/db.js";
import * as schema from "../db/schema.js";
import { createPin, isPinterestConfigured } from "../services/pinterest.service.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TRACKER_FILE = path.resolve(__dirname, "../../.pinterest-posted.json");

// Cap tracker size to avoid MySQL IN-clause blowup on huge catalogs
const MAX_TRACKER_SIZE = 2000;

interface TrackerData {
  postedAsins: string[];
  totalPosted: number;
  lastRun: string | null;
}

function loadTracker(): TrackerData {
  try {
    return JSON.parse(fs.readFileSync(TRACKER_FILE, "utf8")) as TrackerData;
  } catch {
    return { postedAsins: [], totalPosted: 0, lastRun: null };
  }
}

function saveTracker(data: TrackerData): void {
  // Trim oldest entries if over cap
  if (data.postedAsins.length > MAX_TRACKER_SIZE) {
    data.postedAsins = data.postedAsins.slice(-MAX_TRACKER_SIZE);
  }
  fs.writeFileSync(TRACKER_FILE, JSON.stringify(data, null, 2));
}

function buildDescription(
  name: string,
  price: string,
  categoryName: string | null,
  rating: number
): string {
  const priceNum = parseFloat(price);
  const priceStr = priceNum > 0 ? `₹${priceNum.toLocaleString("en-IN")}` : "";
  const cat = categoryName ?? "Product";
  const catTag = cat.replace(/[^a-zA-Z0-9]/g, "");

  return [
    name,
    priceStr ? `Now at ${priceStr} on Amazon India!` : "Available on Amazon India!",
    `⭐ ${rating}/5 — Top-rated ${cat} for Indian buyers.`,
    `Tap to see full review and buy on Amazon India.`,
    `#BestBuysIndia #Amazon #${catTag} #IndianShopping #OnlineShopping`,
  ].join("\n").slice(0, 500);
}

export interface PinterestPostResult {
  posted: number;
  skipped: number;
  failed: number;
  details: Array<{ name: string; status: "posted" | "skipped" | "failed"; error?: string }>;
}

export async function runPinterestAutoPost(): Promise<PinterestPostResult> {
  if (!isPinterestConfigured()) {
    console.log("[Pinterest] Not configured — skipping.");
    return { posted: 0, skipped: 0, failed: 0, details: [] };
  }

  const boardId    = process.env.PINTEREST_BOARD_ID!;
  const pinsPerRun = Math.min(parseInt(process.env.PINTEREST_PINS_PER_RUN ?? "3", 10), 10);
  const minRating  = parseFloat(process.env.PINTEREST_MIN_RATING ?? "4.0");

  const tracker = loadTracker();
  const postedAsins = tracker.postedAsins;

  // Base where conditions
  const baseWhere = and(
    gte(schema.products.rating, minRating),
    sql`CAST(${schema.products.price} AS DECIMAL(10,2)) > 0`,
    sql`${schema.products.imageUrl} IS NOT NULL AND ${schema.products.imageUrl} != ''`,
    sql`${schema.products.amazonAsin} IS NOT NULL AND ${schema.products.amazonAsin} != ''`,
    sql`${schema.products.affiliateUrl} IS NOT NULL AND ${schema.products.affiliateUrl} != ''`,
  );

  const whereClause = postedAsins.length > 0
    ? and(baseWhere, notInArray(schema.products.amazonAsin, postedAsins))
    : baseWhere;

  // Fetch more than needed — some may fail, and we RAND() to rotate categories
  const candidates = await db
    .select({
      id:           schema.products.id,
      name:         schema.products.name,
      price:        schema.products.price,
      rating:       schema.products.rating,
      imageUrl:     schema.products.imageUrl,
      affiliateUrl: schema.products.affiliateUrl,
      amazonAsin:   schema.products.amazonAsin,
      categoryName: schema.categories.name,
    })
    .from(schema.products)
    .leftJoin(schema.categories, eq(schema.products.categoryId, schema.categories.id))
    .where(whereClause)
    .orderBy(desc(schema.products.rating), sql`RAND()`)
    .limit(pinsPerRun * 4);

  let posted = 0, skipped = 0, failed = 0;
  const details: PinterestPostResult["details"] = [];

  for (const product of candidates) {
    if (posted >= pinsPerRun) break;

    if (!product.amazonAsin || !product.imageUrl || !product.affiliateUrl) {
      skipped++;
      details.push({ name: product.name, status: "skipped" });
      continue;
    }

    const title       = product.name.slice(0, 100);
    const description = buildDescription(product.name, product.price, product.categoryName, product.rating);

    const result = await createPin({ title, description, imageUrl: product.imageUrl, link: product.affiliateUrl, boardId });

    if (result.ok) {
      tracker.postedAsins.push(product.amazonAsin);
      tracker.totalPosted = (tracker.totalPosted ?? 0) + 1;
      posted++;
      details.push({ name: title, status: "posted" });
      console.log(`[Pinterest] ✓ ${title.slice(0, 60)} (pin: ${result.pinId})`);
    } else {
      failed++;
      details.push({ name: title, status: "failed", error: result.error });
      console.error(`[Pinterest] ✗ ${title.slice(0, 60)} — ${result.error}`);

      // Rate limit → stop early, retry next cycle
      if (result.error?.includes("429") || result.error?.toLowerCase().includes("rate limit")) {
        console.warn("[Pinterest] Rate limit hit — stopping this run.");
        break;
      }
    }

    // Pinterest recommends ≥ 1s between requests
    await new Promise(r => setTimeout(r, 1500));
  }

  tracker.lastRun = new Date().toISOString();
  saveTracker(tracker);

  return { posted, skipped, failed, details };
}
