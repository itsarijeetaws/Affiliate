/**
 * Price-update service — scrapes Amazon India product pages for current prices.
 * No Amazon PA API required.
 * Called by: daily-price-cron.ts (2 AM every day) and /automation/update-prices endpoint.
 *
 * Strategy (in order of reliability):
 *   1. JSON-LD structured data  — server-rendered by Amazon for SEO, survives bot checks
 *   2. window.DATA / GTM JSON   — price in inline JS data blobs
 *   3. DOM class patterns        — classic selectors (may fail if CAPTCHA returned)
 */

import axios from "axios";
import { eq, isNotNull, ne, and } from "drizzle-orm";
import { db } from "../lib/db.js";
import * as schema from "../db/schema.js";

// Rotate UAs slightly to reduce fingerprinting
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
];

function pickUA() { return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]; }

function buildHeaders() {
  return {
    "User-Agent": pickUA(),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-IN,en-GB;q=0.9,en;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
    "DNT": "1",
    "Upgrade-Insecure-Requests": "1",
  };
}

const DELAY_MS = 4000; // slightly longer = lower ban rate

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

/** Extract price from a JSON-LD offer object (recursive) */
function priceFromJsonLd(data: unknown): number | null {
  if (!data || typeof data !== "object") return null;
  if (Array.isArray(data)) {
    for (const item of data) {
      const p = priceFromJsonLd(item);
      if (p) return p;
    }
    return null;
  }
  const obj = data as Record<string, unknown>;

  // Check direct price fields
  for (const key of ["price", "lowPrice"]) {
    if (obj[key] !== undefined) {
      const p = parseFloat(String(obj[key]).replace(/,/g, ""));
      if (p > 100) return p; // sanity: Amazon IN prices > ₹100
    }
  }
  // Recurse into offers
  if (obj.offers) return priceFromJsonLd(obj.offers);
  // Recurse into @graph
  if (Array.isArray(obj["@graph"])) return priceFromJsonLd(obj["@graph"]);

  return null;
}

async function fetchPriceForAsin(asin: string): Promise<number | null> {
  try {
    const { data: html } = await axios.get<string>(`https://www.amazon.in/dp/${asin}`, {
      headers: buildHeaders(),
      timeout: 18000,
      decompress: true,
    });

    // ── 1. JSON-LD (most reliable — server-rendered for SEO) ──────────────────
    const jsonLdRe = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let m: RegExpExecArray | null;
    while ((m = jsonLdRe.exec(html)) !== null) {
      try {
        const price = priceFromJsonLd(JSON.parse(m[1]));
        if (price) return price;
      } catch { /* malformed JSON, continue */ }
    }

    // ── 2. Inline JSON data blobs (GTM / window vars) ─────────────────────────
    const inlinePatterns = [
      /"priceAmount"\s*:\s*([\d.]+)/,
      /"buyingPrice"\s*:\s*([\d.]+)/,
      /"displayPrice"\s*:\s*"₹\s*([\d,]+)"/,
      /"price"\s*:\s*"?([\d]{3,6})"?/,  // 3-6 digits → ₹100–999999
    ];
    for (const re of inlinePatterns) {
      const mx = re.exec(html);
      if (mx) {
        const p = parseFloat(mx[1].replace(/,/g, ""));
        if (p > 100) return p;
      }
    }

    // ── 3. DOM class patterns (fragile if CAPTCHA returned) ───────────────────
    // NOTE: No catch-all ₹ pattern — too many false matches (EMI, MRP, related products)
    const domPatterns = [
      // Modern Amazon IN layout
      /"corePriceDisplay_desktop_feature_div"[\s\S]{0,500}?a-price-whole[^>]*>([\d,]+)/,
      /id="apex_offerDisplay_desktop"[\s\S]{0,500}?a-price-whole[^>]*>([\d,]+)/,
      // Classic selectors
      /class="a-price-whole"[^>]*>\s*([\d,]+)/,
      /id="priceblock_ourprice"[^>]*>\s*₹\s*([\d,]+)/,
      /id="priceblock_dealprice"[^>]*>\s*₹\s*([\d,]+)/,
    ];
    for (const re of domPatterns) {
      const mx = re.exec(html);
      if (mx) {
        const p = parseFloat(mx[1].replace(/,/g, ""));
        if (p > 0) return p;
      }
    }

    return null;
  } catch {
    return null;
  }
}

export async function runPriceUpdateJob(): Promise<{ updated: number; skipped: number; failed: number }> {
  // Only process products that have a valid ASIN
  const products = await db.select({
    id: schema.products.id,
    amazonAsin: schema.products.amazonAsin,
    price: schema.products.price,
  })
  .from(schema.products)
  .where(and(
    isNotNull(schema.products.amazonAsin),
    ne(schema.products.amazonAsin, ""),
  ));

  let updated = 0, skipped = 0, failed = 0;

  for (let i = 0; i < products.length; i++) {
    const { id, amazonAsin, price: oldPrice } = products[i];
    if (!amazonAsin) { skipped++; continue; } // guard: skip null/empty
    const newPrice = await fetchPriceForAsin(amazonAsin);

    if (newPrice === null) {
      failed++;
    } else if (Math.abs(newPrice - Number(oldPrice)) < 0.5) {
      skipped++;
    } else {
      await db.update(schema.products)
        .set({ price: String(newPrice), lastUpdated: new Date() })
        .where(eq(schema.products.id, id));
      updated++;
    }

    // Polite delay — skip after last product
    if (i < products.length - 1) await sleep(DELAY_MS);
  }

  return { updated, skipped, failed };
}
