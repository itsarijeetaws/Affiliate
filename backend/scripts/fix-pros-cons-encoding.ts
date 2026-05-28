/**
 * Fix double-encoded pros/cons in the database.
 *
 * Root cause: Drizzle json() columns auto-serialize, but code was also calling
 * JSON.stringify() before passing the value → stored as JSON string instead of array.
 *
 * This script finds rows where pros/cons is a string (not array) and re-saves
 * the correctly parsed value.
 *
 * Run:
 *   cd ~/Affiliate/backend
 *   npx tsx scripts/fix-pros-cons-encoding.ts
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

function tryParse(val: unknown): string[] | null {
  if (Array.isArray(val)) return null; // already correct — no fix needed
  if (typeof val !== "string") return [];

  // Attempt to parse the string as JSON
  try {
    const inner = JSON.parse(val);
    if (Array.isArray(inner)) return inner as string[];
    // It's a JSON string of a JSON string — parse one more time
    if (typeof inner === "string") {
      const inner2 = JSON.parse(inner);
      if (Array.isArray(inner2)) return inner2 as string[];
    }
    return [String(inner)];
  } catch {
    return val ? [val] : [];
  }
}

async function main() {
  const pool = mysql.createPool({
    ...parseDbUrl(DB_URL!),
    waitForConnections: true,
    connectionLimit: 2,
  });

  const [rows] = await pool.query<mysql.RowDataPacket[]>(
    `SELECT id, pros, cons FROM product ORDER BY id`
  );

  let fixed = 0;
  let skipped = 0;

  for (const row of rows) {
    const fixedPros = tryParse(row.pros);
    const fixedCons = tryParse(row.cons);

    // Skip rows where both are already arrays (tryParse returns null)
    if (fixedPros === null && fixedCons === null) {
      skipped++;
      continue;
    }

    const newPros = fixedPros ?? (Array.isArray(row.pros) ? row.pros : []);
    const newCons = fixedCons ?? (Array.isArray(row.cons) ? row.cons : []);

    await pool.execute(
      `UPDATE product SET pros = ?, cons = ? WHERE id = ?`,
      [JSON.stringify(newPros), JSON.stringify(newCons), row.id]
    );

    fixed++;
    if (fixed <= 20 || fixed % 50 === 0) {
      console.log(`[${row.id}] fixed pros(${JSON.stringify(newPros).slice(0, 60)}) cons(${JSON.stringify(newCons).slice(0, 40)})`);
    }
  }

  console.log(`\n✅ Done — fixed: ${fixed}  already-correct: ${skipped}`);
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
