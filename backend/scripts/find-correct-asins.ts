/**
 * For products with suspiciously wrong prices, search Amazon.in by product name
 * and suggest correct ASINs. Does NOT write to DB — output only.
 *
 * Run:
 *   cd ~/Affiliate/backend
 *   npx tsx scripts/find-correct-asins.ts
 *
 * Optional: filter by category
 *   npx tsx scripts/find-correct-asins.ts smartphones
 *
 * Then use the admin Products tab to update the ASIN for each product.
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
];
function pickUA() { return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]; }
function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

type Candidate = { asin: string; title: string; price: number };

/** Search Amazon.in for a product name, return top 5 ASINs + prices */
async function searchAmazon(query: string): Promise<Candidate[]> {
  const encoded = encodeURIComponent(query);
  try {
    const { data: html } = await axios.get<string>(
      `https://www.amazon.in/s?k=${encoded}&i=electronics`,
      {
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
      }
    );

    if (html.includes("captcha") || html.includes("Type the characters")) {
      return [];
    }

    const candidates: Candidate[] = [];

    // Extract ASIN + title + price from search result cards
    // Pattern: data-asin="BXXXXXXXX" ... a-size-medium a-color-base ... (title) ... a-price-whole
    const cardRe = /data-asin="([A-Z0-9]{10})"[\s\S]{0,3000}?class="[^"]*a-size-medium[^"]*"[^>]*>([\s\S]{0,300}?)<\/span>/g;
    let m: RegExpExecArray | null;
    const seen = new Set<string>();

    while ((m = cardRe.exec(html)) !== null && candidates.length < 5) {
      const asin = m[1];
      if (seen.has(asin) || asin === "undefined") continue;
      seen.add(asin);

      // Clean title
      const rawTitle = m[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
      if (!rawTitle || rawTitle.length < 5) continue;

      // Find price near this ASIN occurrence
      const block = html.slice(m.index, m.index + 4000);
      const priceM = /class="a-price-whole"[^>]*>\s*([\d,]+)/.exec(block);
      const price = priceM ? parseFloat(priceM[1].replace(/,/g, "")) : 0;

      candidates.push({ asin, title: rawTitle.slice(0, 80), price });
    }

    return candidates;
  } catch {
    return [];
  }
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

  // Default: find products where price looks wrong
  // Heuristics:
  //   - Category "smartphones" priced > ₹40,000 (likely wrong ASIN for budget phone)
  //   - Or pass category manually and check all
  let query: string;
  let params: (string | number)[];

  if (categoryFilter) {
    query = `SELECT p.id, p.name, p.price, p.amazon_asin
             FROM product p
             JOIN category c ON p.category_id = c.id
             WHERE c.slug = ?
               AND p.amazon_asin IS NOT NULL AND p.amazon_asin != ''
             ORDER BY p.price DESC`;
    params = [categoryFilter];
  } else {
    // Auto-detect: budget category products with suspiciously high prices
    query = `SELECT p.id, p.name, p.price, p.amazon_asin
             FROM product p
             JOIN category c ON p.category_id = c.id
             WHERE c.slug IN ('smartphones', 'tablets')
               AND p.price > 40000
               AND p.amazon_asin IS NOT NULL
             ORDER BY p.price DESC`;
    params = [];
  }

  const [rows] = await pool.query<mysql.RowDataPacket[]>(query, params);
  const products = rows as ProductRow[];

  console.log(`\n▶  Checking ${products.length} products${categoryFilter ? ` in category: ${categoryFilter}` : " (suspected wrong ASIN)"}\n`);
  console.log("=".repeat(100));

  for (const row of products) {
    const currentPrice = parseFloat(row.price);
    // Use first 3–4 words of product name as search query (more precise)
    const searchQuery = row.name.split(" ").slice(0, 4).join(" ");

    console.log(`\n📦 ${row.name}`);
    console.log(`   Current: ASIN=${row.amazon_asin}  Price=₹${currentPrice.toFixed(0)}  ID=${row.id}`);
    console.log(`   Searching Amazon for: "${searchQuery}"`);

    const candidates = await searchAmazon(searchQuery);

    if (candidates.length === 0) {
      console.log("   ⚠ No results (CAPTCHA or no match)");
    } else {
      console.log("   Candidates:");
      for (const c of candidates) {
        const marker = c.asin === row.amazon_asin ? " ← CURRENT" : "";
        const priceStr = c.price > 0 ? `₹${c.price.toFixed(0)}` : "no price";
        console.log(`     ${c.asin}  ${priceStr.padEnd(12)} ${c.title}${marker}`);
      }
      console.log(`   → Fix in admin: Products → filter smartphones → Edit ID ${row.id} → paste correct ASIN`);
    }

    console.log("-".repeat(100));
    await sleep(4000);
  }

  console.log("\n✅  Done. Use admin UI to update ASIN for any mismatched products.");
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
