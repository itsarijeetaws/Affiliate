/**
 * Post unposted buying guides to Telegram channel.
 * Tracks posted slugs in backend/.telegram-posted.json
 * Posts up to 3 guides per run, then 1 deal of the day.
 *
 * Run: cd backend && npx tsx scripts/telegram-post-guides.ts
 * Or called automatically from daily cron.
 */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import mysql from "mysql2/promise";
import { postGuideToChannel, postDealToChannel, notifyAdmin, isTelegramConfigured } from "../src/services/telegram.service.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const DB_URL      = process.env.DATABASE_URL!;
const SITE_URL    = process.env.NEXT_PUBLIC_SITE_URL ?? "https://bestbuysindia.com";
const POSTED_FILE = path.resolve(__dirname, "../.telegram-posted.json");
const MAX_GUIDES_PER_RUN = 3;

function parseDbUrl(url: string) {
  const u = new URL(url);
  const socketPath = u.searchParams.get("socketPath");
  return {
    user: u.username,
    password: decodeURIComponent(u.password),
    database: u.pathname.slice(1),
    ...(socketPath ? { socketPath } : { host: u.hostname, port: Number(u.port) || 3306 }),
  };
}

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

async function main() {
  if (!isTelegramConfigured()) {
    console.log("❌ TELEGRAM_BOT_TOKEN or TELEGRAM_CHANNEL_ID not set in .env");
    process.exit(1);
  }

  const pool = mysql.createPool({
    ...parseDbUrl(DB_URL),
    waitForConnections: true,
    connectionLimit: 2,
  });

  const posted = loadPosted();
  let guidesSent = 0;

  // ── Post unposted buying guides ───────────────────────────────────────────
  const [guideRows] = await pool.query<mysql.RowDataPacket[]>(
    `SELECT b.slug, b.title, b.excerpt, c.name AS categoryName
     FROM blogpost b
     LEFT JOIN category c ON b.category_id = c.id
     WHERE b.status = 'published'
     ORDER BY b.createdAt DESC
     LIMIT 200`
  );

  console.log(`\nFound ${guideRows.length} published guides. ${posted.size} already posted.`);

  for (const row of guideRows) {
    if (guidesSent >= MAX_GUIDES_PER_RUN) break;
    if (posted.has(row.slug as string)) continue;

    process.stdout.write(`  Posting guide: ${row.title} ... `);
    const ok = await postGuideToChannel({
      title: row.title as string,
      slug: row.slug as string,
      excerpt: row.excerpt as string | null,
      categoryName: row.categoryName as string,
    });

    if (ok) {
      posted.add(row.slug as string);
      savePosted(posted);
      guidesSent++;
      console.log("✓");
    } else {
      console.log("✗ failed");
    }

    // Rate limit: 1 message per 3s
    await new Promise(r => setTimeout(r, 3000));
  }

  // ── Deal of the day ───────────────────────────────────────────────────────
  const todayKey = `deal:${new Date().toISOString().slice(0, 10)}`;
  if (!posted.has(todayKey)) {
    const [dealRows] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT p.name, p.slug, p.price, p.rating, p.image_url AS imageUrl,
              p.affiliate_url AS affiliateUrl, c.name AS categoryName
       FROM product p
       LEFT JOIN category c ON p.category_id = c.id
       WHERE p.rating >= 4.3 AND p.price > 0
       ORDER BY RAND()
       LIMIT 1`
    );

    if (dealRows.length > 0) {
      const deal = dealRows[0];
      process.stdout.write(`  Posting deal: ${deal.name} ... `);
      const ok = await postDealToChannel({
        name: deal.name as string,
        slug: deal.slug as string,
        price: Number(deal.price),
        rating: Number(deal.rating),
        imageUrl: deal.imageUrl as string,
        affiliateUrl: deal.affiliateUrl as string,
        categoryName: deal.categoryName as string,
      });

      if (ok) {
        posted.add(todayKey);
        savePosted(posted);
        console.log("✓");
      } else {
        console.log("✗ failed");
      }
    }
  } else {
    console.log("  Deal of the day already posted today — skip");
  }

  console.log(`\n✅ Done — guides sent: ${guidesSent}`);
  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  await notifyAdmin(`Script error: ${String(err)}`).catch(() => {});
  process.exit(1);
});
