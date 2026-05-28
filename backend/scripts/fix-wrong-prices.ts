/**
 * Fix wrong prices imported via CSV.
 * Fetches current price from Amazon for every product and updates if different.
 * More aggressive than daily cron — retries 3x per product, shorter delay.
 *
 * Run:
 *   cd ~/Affiliate/backend
 *   npx tsx scripts/fix-wrong-prices.ts
 *
 * Optional: filter to one category
 *   npx tsx scripts/fix-wrong-prices.ts smartphones
 *   npx tsx scripts/fix-wrong-prices.ts laptops
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
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
];
function pickUA() { return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]; }
function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

/** Extract price from JSON-LD (recursive) */
function priceFromJsonLd(data: unknown): number | null {
  if (!data || typeof data !== "object") return null;
  if (Array.isArray(data)) {
    for (const item of data) { const p = priceFromJsonLd(item); if (p) return p; }
    return null;
  }
  const obj = data as Record<string, unknown>;
  for (const key of ["price", "lowPrice"]) {
    if (obj[key] !== undefined) {
      const p = parseFloat(String(obj[key]).replace(/,/g, ""));
      if (p > 50) return p;
    }
  }
  if (obj.offers) return priceFromJsonLd(obj.offers);
  if (Array.isArray(obj["@graph"])) return priceFromJsonLd(obj["@graph"]);
  return null;
}

async function fetchPrice(asin: string): Promise<number | null> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const { data: html } = await axios.get<string>(`https://www.amazon.in/dp/${asin}`, {
        headers: {
          "User-Agent": pickUA(),
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-IN,en-GB;q=0.9,en;q=0.8",
          "Accept-Encoding": "gzip, deflate, br",
          "Cache-Control": "no-cache",
          "DNT": "1",
        },
        timeout: 20000,
        decompress: true,
      });

      // 1. JSON-LD
      const jsonLdRe = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
      let m: RegExpExecArray | null;
      while ((m = jsonLdRe.exec(html)) !== null) {
        try {
          const p = priceFromJsonLd(JSON.parse(m[1]));
          if (p) return p;
        } catch { /* malformed */ }
      }

      // 2. Inline JSON blobs
      const inlinePatterns = [
        /"priceAmount"\s*:\s*([\d.]+)/,
        /"buyingPrice"\s*:\s*([\d.]+)/,
        /"displayPrice"\s*:\s*"₹\s*([\d,]+)"/,
      ];
      for (const re of inlinePatterns) {
        const mx = re.exec(html);
        if (mx) {
          const p = parseFloat(mx[1].replace(/,/g, ""));
          if (p > 50) return p;
        }
      }

      // 3. DOM — targeted class selectors only (no catch-all ₹)
      const domPatterns = [
        /"corePriceDisplay_desktop_feature_div"[\s\S]{0,500}?a-price-whole[^>]*>([\d,]+)/,
        /class="a-price-whole"[^>]*>\s*([\d,]+)/,
        /id="priceblock_ourprice"[^>]*>\s*₹\s*([\d,]+)/,
        /id="priceblock_dealprice"[^>]*>\s*₹\s*([\d,]+)/,
      ];
      for (const re of domPatterns) {
        const mx = re.exec(html);
        if (mx) {
          const p = parseFloat(mx[1].replace(/,/g, ""));
          if (p > 50) return p;
        }
      }

      // CAPTCHA check
      if (html.includes("captcha") || html.includes("robot") || html.includes("Type the characters")) {
        console.log(`  ⚠ CAPTCHA on attempt ${attempt}, waiting 10s…`);
        await sleep(10000);
        continue;
      }

      return null; // page loaded but no price found
    } catch {
      if (attempt < 3) await sleep(5000);
    }
  }
  return null;
}

interface ProductRow {
  id: number;
  name: string;
  price: string;
  amazon_asin: string;
}

async function main() {
  const categoryFilter = process.argv[2] ?? null;
  const pool = mysql.createPool({ ...parseDbUrl(DB_URL!), waitForConnections: true, connectionLimit: 2 });

  const query = categoryFilter
    ? `SELECT p.id, p.name, p.price, p.amazon_asin
       FROM product p
       JOIN category c ON p.category_id = c.id
       WHERE c.slug = ? AND (p.amazon_asin IS NOT NULL AND p.amazon_asin != '')
       ORDER BY p.id`
    : `SELECT p.id, p.name, p.price, p.amazon_asin
       FROM product p
       WHERE p.amazon_asin IS NOT NULL AND p.amazon_asin != ''
       ORDER BY p.id`;

  const [rows] = await pool.query<mysql.RowDataPacket[]>(
    query,
    categoryFilter ? [categoryFilter] : []
  );

  const products = rows as ProductRow[];
  console.log(`\n▶  ${products.length} products to check${categoryFilter ? ` (category: ${categoryFilter})` : ""}\n`);

  let updated = 0, skipped = 0, failed = 0;

  for (let i = 0; i < products.length; i++) {
    const row = products[i];
    const label = `[${String(i + 1).padStart(4)}/${products.length}]`;
    const namePreview = row.name.slice(0, 48).padEnd(48);
    const oldPrice = parseFloat(row.price);

    const newPrice = await fetchPrice(row.amazon_asin);

    if (newPrice === null) {
      failed++;
      console.log(`${label} ✗ ${namePreview} old=₹${oldPrice}`);
    } else if (Math.abs(newPrice - oldPrice) < 1) {
      skipped++;
      // console.log(`${label} = ${namePreview} ₹${newPrice}`);
    } else {
      await pool.execute(
        `UPDATE product SET price = ?, last_updated = NOW(), updatedAt = NOW() WHERE id = ?`,
        [String(newPrice), row.id]
      );
      updated++;
      const arrow = newPrice < oldPrice ? "↓" : "↑";
      console.log(`${label} ${arrow} ${namePreview} ₹${oldPrice} → ₹${newPrice}`);
    }

    if (i < products.length - 1) await sleep(3000);
  }

  console.log(`\n✅  Done — updated: ${updated}  unchanged: ${skipped}  failed: ${failed}`);
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
