import cron from "node-cron";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { eq, desc, gte, and, sql } from "drizzle-orm";
import { env } from "../config/env.js";
import { db } from "../lib/db.js";
import * as schema from "../db/schema.js";
import { runPriceUpdateJob } from "../services/price-update.service.js";
import {
  isTelegramConfigured,
  notifyAdmin,
  postGuideToChannel,
  postDealToChannel,
} from "../services/telegram.service.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const POSTED_FILE = path.resolve(__dirname, "../../.telegram-posted.json");
const MAX_GUIDES_PER_RUN = 3;

function loadPosted(): Set<string> {
  try {
    const data = JSON.parse(fs.readFileSync(POSTED_FILE, "utf8")) as string[];
    return new Set(data);
  } catch {
    return new Set();
  }
}

function savePosted(posted: Set<string>): void {
  fs.writeFileSync(POSTED_FILE, JSON.stringify([...posted], null, 2));
}

async function runTelegramPost(): Promise<{ guidesSent: number; dealSent: boolean }> {
  const posted = loadPosted();
  let guidesSent = 0;
  let dealSent = false;

  // ── Post unposted buying guides ──────────────────────────────────────────
  const guides = await db
    .select({
      slug: schema.blogPosts.slug,
      title: schema.blogPosts.title,
      excerpt: schema.blogPosts.excerpt,
      categoryName: schema.categories.name,
    })
    .from(schema.blogPosts)
    .leftJoin(schema.categories, eq(schema.blogPosts.categoryId, schema.categories.id))
    .where(eq(schema.blogPosts.status, "published"))
    .orderBy(desc(schema.blogPosts.createdAt))
    .limit(200);

  for (const guide of guides) {
    if (guidesSent >= MAX_GUIDES_PER_RUN) break;
    if (posted.has(guide.slug)) continue;

    const ok = await postGuideToChannel({
      title: guide.title,
      slug: guide.slug,
      excerpt: guide.excerpt,
      categoryName: guide.categoryName ?? undefined,
    });

    if (ok) {
      posted.add(guide.slug);
      savePosted(posted);
      guidesSent++;
    }

    // Rate limit: 1 message per 3s
    await new Promise(r => setTimeout(r, 3000));
  }

  // ── Deal of the day ───────────────────────────────────────────────────────
  const todayKey = `deal:${new Date().toISOString().slice(0, 10)}`;
  if (!posted.has(todayKey)) {
    const [deal] = await db
      .select({
        name: schema.products.name,
        slug: schema.products.slug,
        price: schema.products.price,
        rating: schema.products.rating,
        imageUrl: schema.products.imageUrl,
        affiliateUrl: schema.products.affiliateUrl,
        categoryName: schema.categories.name,
      })
      .from(schema.products)
      .leftJoin(schema.categories, eq(schema.products.categoryId, schema.categories.id))
      .where(and(
        gte(schema.products.rating, 4.3),
        sql`${schema.products.price} > 0`
      ))
      .orderBy(sql`RAND()`)
      .limit(1);

    if (deal) {
      const ok = await postDealToChannel({
        name: deal.name,
        slug: deal.slug,
        price: Number(deal.price),
        rating: deal.rating,
        imageUrl: deal.imageUrl ?? undefined,
        affiliateUrl: deal.affiliateUrl ?? undefined,
        categoryName: deal.categoryName ?? undefined,
      });

      if (ok) {
        posted.add(todayKey);
        savePosted(posted);
        dealSent = true;
      }
    }
  }

  return { guidesSent, dealSent };
}

export function startDailyPriceCron(): void {
  if (!env.enableDailyCron) return;

  // 2 AM IST = price update
  cron.schedule("0 2 * * *", async () => {
    try {
      const result = await runPriceUpdateJob();
      await db.insert(schema.automationLogs).values({
        event: "daily-price-update",
        status: "success",
        payload: result
      });
    } catch (error) {
      await db.insert(schema.automationLogs).values({
        event: "daily-price-update",
        status: "failed",
        payload: {},
        message: String(error)
      });
    }
  });

  // 10 AM IST = Telegram posts (3 guides + deal of the day)
  cron.schedule("30 4 * * *", async () => {
    if (!isTelegramConfigured()) return;
    try {
      const result = await runTelegramPost();
      await db.insert(schema.automationLogs).values({
        event: "telegram-post",
        status: "success",
        payload: result
      });
    } catch (error) {
      console.error("[Cron] Telegram post failed:", String(error));
      await notifyAdmin(`Daily Telegram post failed: ${String(error)}`).catch(() => {});
      await db.insert(schema.automationLogs).values({
        event: "telegram-post",
        status: "failed",
        payload: {},
        message: String(error)
      });
    }
  });
}
