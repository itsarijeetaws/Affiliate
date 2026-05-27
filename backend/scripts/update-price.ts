/**
 * Manually set price for a product by ASIN.
 * Use when the auto-scraper fails (Amazon bot block, CAPTCHA, etc.).
 *
 * Usage:
 *   cd /var/www/.../Affiliate/backend
 *   npx tsx scripts/update-price.ts B09TWCHY96 32990
 */

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
  const socketPath = u.searchParams.get("socketPath");
  return {
    user: u.username,
    password: decodeURIComponent(u.password),
    database: u.pathname.slice(1),
    ...(socketPath ? { socketPath } : { host: u.hostname, port: Number(u.port) || 3306 }),
  };
}

const [,, asin, priceArg] = process.argv;

if (!asin || !priceArg) {
  console.error("Usage: npx tsx scripts/update-price.ts <ASIN> <newPrice>");
  console.error("Example: npx tsx scripts/update-price.ts B0D4MNJCZT 32990");
  process.exit(1);
}

const newPrice = parseFloat(priceArg);
if (isNaN(newPrice) || newPrice <= 0) {
  console.error("Invalid price:", priceArg);
  process.exit(1);
}

const conn = await mysql.createConnection(parseDbUrl(DB_URL!));

const [rows] = await conn.query<mysql.RowDataPacket[]>(
  "SELECT id, name, price FROM product WHERE amazon_asin = ? LIMIT 1",
  [asin]
);

if (!rows.length) {
  console.error(`No product found with ASIN: ${asin}`);
  await conn.end();
  process.exit(1);
}

const product = rows[0] as { id: number; name: string; price: string };
console.log(`Product : [${product.id}] ${product.name}`);
console.log(`Old price: ₹${product.price}`);
console.log(`New price: ₹${newPrice}`);

await conn.execute(
  "UPDATE product SET price = ?, last_updated = NOW(), updatedAt = NOW() WHERE id = ?",
  [String(newPrice), product.id]
);

console.log("✓ Done");
await conn.end();
