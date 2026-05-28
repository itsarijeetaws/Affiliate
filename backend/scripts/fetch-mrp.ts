/**
 * Fetch MRP (strikethrough / original price) from Amazon for every product
 * that currently has no MRP set, then update only the mrp column.
 *
 * SAFE — never touches price, name, rating, or any other field.
 * Only writes mrp when: fetched mrp > current price AND mrp < price * 8
 *
 * Run:
 *   cd ~/Affiliate/backend
 *   npx tsx scripts/fetch-mrp.ts
 *
 * Optional category filter:
 *   npx tsx scripts/fetch-mrp.ts womens-fashion
 *   npx tsx scripts/fetch-mrp.ts smartphones
 *
 * Background (full catalog):
 *   nohup npx tsx scripts/fetch-mrp.ts > /tmp/mrp-fetch.log 2>&1 &
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

/**
 * Extract MRP (strikethrough / was-price) from Amazon page HTML.
 * Tries multiple extraction strategies in order of reliability.
 * Returns null if no valid MRP found.
 */
function extractMrp(html: string, currentPrice: number): number | null {
  // ── 1. JSON-LD highPrice ──────────────────────────────────────────────────
  const jsonLdRe = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = jsonLdRe.exec(html)) !== null) {
    try {
      const obj = JSON.parse(m[1]) as Record<string, unknown>;
      // Check highPrice at top level
      const high = obj.highPrice ?? (obj.offers as Record<string, unknown> | undefined)?.highPrice;
      if (high !== undefined) {
        const p = parseFloat(String(high).replace(/,/g, ""));
        if (isValidMrp(p, currentPrice)) return p;
      }
    } catch { /* malformed */ }
  }

  // ── 2. Inline JSON — basis/list/was price patterns ───────────────────────
  const inlinePatterns: RegExp[] = [
    /"basisPrice"\s*:\s*\{[^}]*"amount"\s*:\s*"?([\d.]+)"?/,
    /"listPrice"\s*:\s*\{[^}]*"amount"\s*:\s*"?([\d.]+)"?/,
    /"wasPrice"\s*:\s*\{[^}]*"amount"\s*:\s*"?([\d.]+)"?/,
    /"mrpPrice"\s*:\s*([\d.]+)/,
    /"maximumRetailPrice"\s*:\s*([\d.]+)/,
    /"strikethroughPrice"\s*:\s*([\d.]+)/,
    // displayPrice style: "₹1,999"
    /"basisPrice"\s*:\s*\{[^}]*"displayAmount"\s*:\s*"₹\s*([\d,]+)"/,
    /"listPrice"\s*:\s*"₹\s*([\d,]+)"/,
  ];
  for (const re of inlinePatterns) {
    const mx = re.exec(html);
    if (mx) {
      const p = parseFloat(mx[1].replace(/,/g, ""));
      if (isValidMrp(p, currentPrice)) return p;
    }
  }

  // ── 3. DOM — strikethrough price selectors ───────────────────────────────
  const domPatterns: RegExp[] = [
    // Modern layout: basis price block
    /class="[^"]*a-text-price[^"]*"[^>]*data-a-strike="true"[^>]*>[\s\S]{0,60}?₹\s*([\d,]+)/,
    // Classic MRP label
    /id="listPrice"[^>]*>\s*₹\s*([\d,]+)/,
    /id="priceblock_saleprice"[\s\S]{0,200}?id="listPrice"[^>]*>\s*₹\s*([\d,]+)/,
    // "M.R.P.: ₹X,XXX"
    /M\.R\.P\.:?\s*₹\s*([\d,]+)/,
    /MRP:?\s*₹\s*([\d,]+)/i,
    // corePriceDisplay basis price
    /"corePriceDisplay_desktop_feature_div"[\s\S]{0,800}?basisPrice[\s\S]{0,200}?a-offscreen[^>]*>\s*₹\s*([\d,]+)/,
    // savingBasisPrice
    /savingBasisPrice[^>]*>[\s\S]{0,100}?₹\s*([\d,]+)/,
  ];
  for (const re of domPatterns) {
    const mx = re.exec(html);
    if (mx) {
      const p = parseFloat(mx[1].replace(/,/g, ""));
      if (isValidMrp(p, currentPrice)) return p;
    }
  }

  return null;
}

/** MRP sanity check: must be > current price, and < price * 8 (avoid capturing unrelated prices) */
function isValidMrp(mrp: number, price: number): boolean {
  return mrp > price && mrp < price * 8 && mrp > 0;
}

interface ProductRow {
  id: number;
  name: string;
  price: string;
  amazon_asin: string;
}

async function fetchMrpForAsin(asin: string, currentPrice: number): Promise<number | null> {
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

      if (html.includes("captcha") || html.includes("Type the characters")) {
        console.log(`  ⚠ CAPTCHA attempt ${attempt}, waiting 12s…`);
        await sleep(12000);
        continue;
      }

      return extractMrp(html, currentPrice);
    } catch {
      if (attempt < 3) await sleep(5000);
    }
  }
  return null;
}

async function main() {
  const categoryFilter = process.argv[2] ?? null;
  const pool = mysql.createPool({ ...parseDbUrl(DB_URL!), waitForConnections: true, connectionLimit: 2 });

  // Only fetch products without MRP set (or MRP = 0)
  const query = categoryFilter
    ? `SELECT p.id, p.name, p.price, p.amazon_asin
       FROM product p
       JOIN category c ON p.category_id = c.id
       WHERE c.slug = ?
         AND (p.amazon_asin IS NOT NULL AND p.amazon_asin != '')
         AND (p.mrp IS NULL OR p.mrp = 0)
       ORDER BY p.id`
    : `SELECT p.id, p.name, p.price, p.amazon_asin
       FROM product p
       WHERE p.amazon_asin IS NOT NULL AND p.amazon_asin != ''
         AND (p.mrp IS NULL OR p.mrp = 0)
       ORDER BY p.id`;

  const [rows] = await pool.query<mysql.RowDataPacket[]>(
    query,
    categoryFilter ? [categoryFilter] : []
  );

  const products = rows as ProductRow[];
  console.log(`\n▶  ${products.length} products need MRP${categoryFilter ? ` (category: ${categoryFilter})` : ""}\n`);

  if (products.length === 0) {
    console.log("Nothing to do.");
    await pool.end();
    return;
  }

  let set = 0, skipped = 0, failed = 0;

  for (let i = 0; i < products.length; i++) {
    const row = products[i];
    const label = `[${String(i + 1).padStart(4)}/${products.length}]`;
    const namePreview = row.name.slice(0, 48).padEnd(48);
    const price = parseFloat(row.price);

    const mrp = await fetchMrpForAsin(row.amazon_asin, price);

    if (mrp === null) {
      failed++;
      console.log(`${label} ✗ ${namePreview} ₹${price} (no MRP found)`);
    } else {
      // Extra safety: never write mrp if it failed validation (already checked in extractMrp,
      // but double-check here before touching DB)
      if (!isValidMrp(mrp, price)) {
        skipped++;
        console.log(`${label} - ${namePreview} ₹${price} (mrp ₹${mrp} failed sanity, skipping)`);
      } else {
        await pool.execute(
          `UPDATE product SET mrp = ? WHERE id = ?`,
          [String(mrp), row.id]
        );
        set++;
        const pct = Math.round(((mrp - price) / mrp) * 100);
        console.log(`${label} ✓ ${namePreview} ₹${price} ← MRP ₹${mrp} (${pct}% off)`);
      }
    }

    if (i < products.length - 1) await sleep(3000);
  }

  console.log(`\n✅  Done — set: ${set}  no-mrp: ${failed}  skipped: ${skipped}`);
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
