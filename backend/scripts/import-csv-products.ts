/**
 * Import products from Chrome-extension CSV export.
 * Skips rows where name looks like a price string or is too short.
 * Maps Amazon category names → DB category IDs dynamically.
 *
 * Usage (run from backend/):
 *   npx tsx scripts/import-csv-products.ts /path/to/products.csv
 *
 * After import, run content gen for empty rows:
 *   npx tsx scripts/generate-product-content.ts
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) { console.error("DATABASE_URL not set"); process.exit(1); }

const csvPath = process.argv[2];
if (!csvPath) {
  console.error("Usage: npx tsx scripts/import-csv-products.ts <path-to-csv>");
  process.exit(1);
}

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

function toSlug(s: string): string {
  return s.toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 185);
}

/** Returns true if the name is actually a price string or junk */
function isBadName(name: string): boolean {
  const t = name.trim();
  if (!t || t.length < 8) return true;
  if (/^₹[\d,. ]+$/.test(t)) return true;   // "₹1,999.00"
  if (/^\d[\d,. ]+$/.test(t)) return true;   // "1999.00"
  return false;
}

/** Parse simple CSV (handles quoted fields with commas/newlines) */
function parseCsv(content: string): Record<string, string>[] {
  const lines = content.split(/\r?\n/);
  const headers = splitCsvLine(lines[0]);
  const result: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = splitCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h.toLowerCase().trim()] = (cols[idx] ?? "").trim(); });
    result.push(row);
  }
  return result;
}

function splitCsvLine(line: string): string[] {
  const cols: string[] = [];
  let cur = "";
  let inQ = false;
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ; }
    else if (ch === "," && !inQ) { cols.push(cur.replace(/^"|"$/g, "")); cur = ""; }
    else cur += ch;
  }
  cols.push(cur.replace(/^"|"$/g, ""));
  return cols;
}

/** Map Amazon category string → best-matching DB category id */
function matchCategory(
  csvCat: string,
  dbCats: Array<{ id: number; name: string; slug: string }>
): number {
  const s = csvCat.toLowerCase()
    .replace(/bestsellers? in /i, "")
    .replace(/hot new releases in /i, "")
    .trim();

  // Keyword map → DB category slug keywords
  const keyMap: Array<[string[], string[]]> = [
    [["laptop", "notebook", "chromebook", "ultrabook"], ["laptop"]],
    [["mobile", "smartphone", "tablet", "phone"], ["smartphone", "mobile", "tablet"]],
    [["audio", "headphone", "earphone", "speaker", "home audio", "hi-fi"], ["audio"]],
    [["tv", "television", "home theater", "video"], ["tv", "television", "home"]],
    [["camera", "photography", "action cam"], ["camera"]],
    [["keyboard", "mice", "mouse", "input", "graphic tablet", "components", "computer"], ["computer", "laptop", "keyboard"]],
    [["wearable", "watch", "smartwatch", "fitness tracker"], ["watch", "wearable"]],
    [["mobile accessori", "charger", "power bank", "cable", "usb"], ["mobile-accessories", "accessori"]],
    [["beauty", "body cream", "body wash", "bath", "shower", "lotion"], ["beauty"]],
    [["kitchen", "lunch box", "small kitchen"], ["kitchen", "home"]],
    [["baby", "kids"], ["baby", "kids", "toy"]],
    [["sport", "fitness", "outdoor"], ["sport", "fitness"]],
    [["book"], ["book"]],
    [["jewellery", "jewelry"], ["jewellery", "jewelry", "women"]],
    [["game", "xbox", "playstation", "video game"], ["game"]],
    [["health", "personal care"], ["health"]],
    [["office"], ["office"]],
    [["home"], ["home"]],
    [["electronics"], ["electronic"]],
  ];

  for (const [keywords, slugHints] of keyMap) {
    if (keywords.some(k => s.includes(k))) {
      for (const hint of slugHints) {
        const match = dbCats.find(c =>
          c.slug.includes(hint) || c.name.toLowerCase().includes(hint)
        );
        if (match) return match.id;
      }
    }
  }

  // Fallback: "Electronics" or first category
  const electronics = dbCats.find(c => c.name.toLowerCase().includes("electronic"));
  return electronics?.id ?? dbCats[0]?.id ?? 1;
}

async function main() {
  const content = fs.readFileSync(csvPath, "utf-8");
  const rows = parseCsv(content);
  console.log(`\n📂  Loaded ${rows.length} rows from CSV`);

  const conn = await mysql.createConnection(parseDbUrl(DB_URL!));

  // Fetch all categories
  const [catRows] = await conn.query<mysql.RowDataPacket[]>(
    "SELECT id, name, slug FROM category ORDER BY id"
  );
  const dbCats = catRows as Array<{ id: number; name: string; slug: string }>;
  console.log(`📁  Found ${dbCats.length} categories in DB`);

  let imported = 0;
  let skipped = 0;
  let dupes = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const asin = row["asin"]?.trim();
    const name = row["name"]?.trim();
    const label = `[${String(i + 1).padStart(4)}/${rows.length}]`;

    // Skip bad rows
    if (!asin || isBadName(name)) {
      skipped++;
      continue;
    }

    const price = parseFloat(row["price"] ?? "0") || 0;
    const rating = Math.min(5, Math.max(0, parseFloat(row["rating"] ?? "0") || 0));
    const imageUrl = row["imageurl"] ?? row["image_url"] ?? row["imageurl"] ?? "";
    const affiliateUrl = row["affiliateurl"] ?? row["affiliate_url"] ?? `https://www.amazon.in/dp/${asin}/?tag=adfirststore-21`;
    const csvCat = row["category"] ?? "";
    const categoryId = matchCategory(csvCat, dbCats);

    // Use bullets as description seed if available
    const bulletsRaw = row["bullets"] ?? "";
    const bullets = bulletsRaw.split("|").map(b => b.trim()).filter(Boolean);
    const description = bullets.length
      ? bullets.slice(0, 2).join(" ").slice(0, 500)
      : "";

    const safeName = name.slice(0, 185);
    const slug = toSlug(safeName);
    const now = new Date();

    try {
      const [result] = await conn.execute<mysql.ResultSetHeader>(
        `INSERT IGNORE INTO product
           (name, slug, amazon_asin, price, rating, image_url, category_id,
            description, pros, cons, affiliate_url,
            last_updated, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          safeName, slug, asin, String(price), rating, imageUrl, categoryId,
          description, JSON.stringify([]), JSON.stringify([]),
          affiliateUrl, now, now, now,
        ]
      );

      if (result.affectedRows === 0) {
        dupes++;
        process.stdout.write(`${label} ⟳  ${safeName.slice(0, 50)}\n`);
      } else {
        imported++;
        process.stdout.write(`${label} ✓  ${safeName.slice(0, 50)}\n`);
      }
    } catch (err) {
      failed++;
      console.error(`${label} ✗  ${safeName.slice(0, 50)} — ${String(err).slice(0, 80)}`);
    }
  }

  console.log(`
✅  Done
   Imported  : ${imported}
   Duplicates: ${dupes}  (already in DB, skipped)
   Bad rows  : ${skipped}  (name = price string or too short)
   Failed    : ${failed}
  `);

  if (imported > 0) {
    console.log("▶  Run content generation for new products:");
    console.log("   npx tsx scripts/generate-product-content.ts");
  }

  await conn.end();
}

main().catch(e => { console.error(e); process.exit(1); });
