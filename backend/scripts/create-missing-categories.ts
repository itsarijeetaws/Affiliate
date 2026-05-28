/**
 * Creates missing high-commission categories in the DB.
 * Run: cd backend && npx tsx scripts/create-missing-categories.ts
 */

import mysql from "mysql2/promise";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const DB_URL = process.env.DATABASE_URL!;
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

const MISSING_CATEGORIES = [
  {
    name: "Mobile Accessories",
    slug: "mobile-accessories",
    description: "Chargers, cables, cases, power banks and all mobile phone accessories",
  },
  {
    name: "Toys & Games",
    slug: "toys",
    description: "Board games, action figures, educational toys and fun games for all ages",
  },
  {
    name: "Office Products",
    slug: "office-products",
    description: "Stationery, office supplies, shredders, organizers and work essentials",
  },
];

async function main() {
  const pool = mysql.createPool({
    ...parseDbUrl(DB_URL),
    waitForConnections: true,
    connectionLimit: 2,
  });

  for (const cat of MISSING_CATEGORIES) {
    // Check if already exists
    const [rows] = await pool.query<mysql.RowDataPacket[]>(
      "SELECT id, name FROM category WHERE slug = ? LIMIT 1",
      [cat.slug]
    );

    if ((rows as mysql.RowDataPacket[]).length > 0) {
      console.log(`  ↷  ${cat.name} (${cat.slug}) — already exists (id=${rows[0].id})`);
      continue;
    }

    const now = new Date();
    await pool.execute(
      `INSERT INTO category (name, slug, description, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?)`,
      [cat.name, cat.slug, cat.description, now, now]
    );
    console.log(`  ✓  Created: ${cat.name} (${cat.slug})`);
  }

  // Show all categories after
  const [all] = await pool.query<mysql.RowDataPacket[]>(
    "SELECT id, name, slug FROM category ORDER BY name"
  );
  console.log(`\nAll categories (${all.length}):`);
  for (const c of all as mysql.RowDataPacket[]) {
    console.log(`  [${c.id}] ${c.name} — ${c.slug}`);
  }

  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
