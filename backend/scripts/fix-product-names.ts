/**
 * Fetch full product titles from Amazon product pages and update the DB.
 * Amazon search/category pages truncate titles to ~125 chars; product pages show full titles.
 *
 * Run per-category to avoid CAPTCHA bans:
 *   cd ~/Affiliate/backend
 *   npx tsx scripts/fix-product-names.ts smartphones
 *   npx tsx scripts/fix-product-names.ts laptops
 *   npx tsx scripts/fix-product-names.ts headphones
 *
 * Run all categories (slow — expect CAPTCHA blocks):
 *   npx tsx scripts/fix-product-names.ts
 *
 * Only updates if new title is longer than the current stored title.
 */

import axios from "axios";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) { console.error("DATABASE_URL not set"); process.exit(1); }

function parseDbUrl(url: string) {
  const u = new URL(url);
  const sp = u.searchParams.get("socketPath");
  return {
    user: u.username,
    password: decodeURIComponent(u.password),
    database: u.pathname.slice(1),
    ...(sp ? { socketPath: sp } : { host: u.hostname, port: Number(u.port) || 3306 }),
  };
}

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0",
];

function pickUA() { return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]; }
function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
function jitter(base: number) { return base + Math.floor(Math.random() * 2000); }

function extractTitle(html: string): string | null {
  // Primary: <span id="productTitle">...</span>
  const m = html.match(/id=["']productTitle["'][^>]*>\s*([\s\S]*?)\s*<\/span>/);
  if (m) {
    const raw = m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (raw.length > 10) return raw;
  }

  // Fallback: og:title meta tag (usually full product title)
  const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/);
  if (og) {
    const raw = og[1].replace(/\s+/g, " ").trim();
    if (raw.length > 10 && !raw.includes("Amazon.in")) return raw;
  }

  // Fallback: <title> tag (strips " : Amazon.in: ..." suffix)
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/);
  if (title) {
    const raw = title[1].replace(/\s+/g, " ").trim();
    const cut = raw.split(/\s*[:\|]\s*Amazon/i)[0].trim();
    if (cut.length > 10) return cut;
  }

  return null;
}

interface ProductRow {
  id: number;
  name: string;
  amazon_asin: string;
}

async function fetchTitle(asin: string): Promise<{ title: string | null; captcha: boolean }> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const { data: html } = await axios.get<string>(`https://www.amazon.in/dp/${asin}`, {
        headers: {
          "User-Agent": pickUA(),
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-IN,en-GB;q=0.9,en;q=0.8",
          "Accept-Encoding": "gzip, deflate, br",
          "Cache-Control": "no-cache",
          "DNT": "1",
          "Upgrade-Insecure-Requests": "1",
        },
        timeout: 20000,
        decompress: true,
      });

      if (html.includes("captcha") || html.includes("robot check") || html.includes("Type the characters")) {
        return { title: null, captcha: true };
      }

      const title = extractTitle(html);
      return { title, captcha: false };
    } catch {
      if (attempt < 3) await sleep(4000);
    }
  }
  return { title: null, captcha: false };
}

async function main() {
  const categoryFilter = process.argv[2] ?? null;
  const pool = mysql.createPool({ ...parseDbUrl(DB_URL!), waitForConnections: true, connectionLimit: 2 });

  const query = categoryFilter
    ? `SELECT p.id, p.name, p.amazon_asin
       FROM product p
       JOIN category c ON p.category_id = c.id
       WHERE c.slug = ? AND p.amazon_asin IS NOT NULL AND p.amazon_asin != ''
       ORDER BY p.id`
    : `SELECT p.id, p.name, p.amazon_asin
       FROM product p
       WHERE p.amazon_asin IS NOT NULL AND p.amazon_asin != ''
       ORDER BY p.id`;

  const [rows] = await pool.query<mysql.RowDataPacket[]>(query, categoryFilter ? [categoryFilter] : []);
  const products = rows as ProductRow[];

  console.log(`\n▶  ${products.length} products to process${categoryFilter ? ` (category: ${categoryFilter})` : ""}\n`);

  let updated = 0, skipped = 0, failed = 0, captchaCount = 0;

  for (let i = 0; i < products.length; i++) {
    const row = products[i];
    const label = `[${String(i + 1).padStart(4)}/${products.length}]`;
    const oldName = row.name;

    const { title: newTitle, captcha } = await fetchTitle(row.amazon_asin);

    if (captcha) {
      captchaCount++;
      failed++;
      console.log(`${label} ⚠ CAPTCHA — ${row.amazon_asin} (pausing 60s…)`);
      await sleep(60000);
      continue;
    }

    if (!newTitle) {
      failed++;
      console.log(`${label} ✗ no title found — ${row.amazon_asin}`);
    } else if (newTitle.length <= oldName.length) {
      skipped++;
      // Title not longer — skip
    } else {
      await pool.execute(
        `UPDATE product SET name = ?, updatedAt = NOW() WHERE id = ?`,
        [newTitle, row.id]
      );
      updated++;
      console.log(`${label} ✓ ${row.amazon_asin}`);
      console.log(`        OLD (${oldName.length}): ${oldName.slice(0, 80)}`);
      console.log(`        NEW (${newTitle.length}): ${newTitle.slice(0, 80)}`);
    }

    // Random delay between requests: 3–5s normally, longer after CAPTCHA run
    if (i < products.length - 1) {
      const delay = captchaCount > 0 ? jitter(5000) : jitter(3000);
      await sleep(delay);
    }
  }

  console.log(`\n✅  Done — updated: ${updated}  unchanged: ${skipped}  failed: ${failed}  captchas: ${captchaCount}`);
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
