/**
 * Fix one-row ASIN shift bug from CSV import.
 *
 * Every product's stored amazon_asin is wrong — it belongs to the next product.
 * The CORRECT ASIN is encoded in the image_url (/images/P/{ASIN}.) and affiliate_url (/dp/{ASIN}).
 *
 * Strategy (avoids unique-key conflicts):
 *   1. Find all rows where image_url ASIN ≠ stored amazon_asin (and image/affiliate agree)
 *   2. NULL out all their amazon_asin values in one batch
 *   3. Re-set from image_url ASIN in one batch
 *   4. Report any skipped (duplicate ASIN already on unaffected product)
 *
 * Run (dry-run first):
 *   npx tsx scripts/fix-asin-shift.ts --dry-run
 *
 * Apply:
 *   npx tsx scripts/fix-asin-shift.ts
 */

import mysql from "mysql2/promise";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) { console.error("DATABASE_URL not set"); process.exit(1); }

const DRY_RUN = process.argv.includes("--dry-run");

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

interface MismatchRow {
  id: number;
  name: string;
  stored_asin: string;
  correct_asin: string;
}

async function main() {
  const pool = mysql.createPool({ ...parseDbUrl(DB_URL!), waitForConnections: true, connectionLimit: 2 });

  console.log(`\n▶  fix-asin-shift.ts  [${DRY_RUN ? "DRY RUN" : "LIVE"}]\n`);

  // ── 1. Find all mismatched rows ──────────────────────────────────────────────
  const [rows] = await pool.query<mysql.RowDataPacket[]>(`
    SELECT
      id,
      name,
      amazon_asin AS stored_asin,
      SUBSTRING_INDEX(SUBSTRING_INDEX(image_url,     '/P/', -1), '.', 1) AS correct_asin,
      SUBSTRING_INDEX(SUBSTRING_INDEX(affiliate_url, '/dp/', -1), '?', 1) AS asin_from_url
    FROM product
    WHERE image_url    LIKE '%media-amazon.com/images/P/%'
      AND affiliate_url LIKE '%amazon.in/dp/%'
      AND amazon_asin IS NOT NULL
    HAVING correct_asin = asin_from_url
       AND LENGTH(correct_asin) = 10
       AND correct_asin != stored_asin
    ORDER BY id
  `);

  const mismatches = rows as MismatchRow[];
  console.log(`Found ${mismatches.length} products with mismatched ASIN\n`);

  if (mismatches.length === 0) {
    console.log("Nothing to fix.");
    await pool.end();
    return;
  }

  // Print preview
  console.log("Sample (first 20):");
  console.log("─".repeat(110));
  for (const r of mismatches.slice(0, 20)) {
    const name = r.name.slice(0, 55).padEnd(55);
    console.log(`  [${String(r.id).padStart(5)}] ${name}  ${r.stored_asin} → ${r.correct_asin}`);
  }
  if (mismatches.length > 20) {
    console.log(`  ... and ${mismatches.length - 20} more`);
  }
  console.log("─".repeat(110));

  if (DRY_RUN) {
    console.log("\n✅  Dry-run complete. Run without --dry-run to apply fixes.");
    await pool.end();
    return;
  }

  // ── 2. Check which correct_asins are already taken by OTHER products ─────────
  const correctAsins = mismatches.map(r => r.correct_asin);
  const affectedIds  = mismatches.map(r => r.id);

  const placeholders = correctAsins.map(() => "?").join(",");
  const [takenRows] = await pool.query<mysql.RowDataPacket[]>(
    `SELECT id, name, amazon_asin FROM product
     WHERE amazon_asin IN (${placeholders})
       AND id NOT IN (${affectedIds.map(() => "?").join(",")})`,
    [...correctAsins, ...affectedIds]
  );

  const takenSet = new Set((takenRows as { amazon_asin: string }[]).map(r => r.amazon_asin));
  if (takenSet.size > 0) {
    console.log(`\n⚠  ${takenSet.size} correct ASINs already used by unaffected products (will skip):`);
    for (const r of takenRows as { id: number; name: string; amazon_asin: string }[]) {
      console.log(`     id=${r.id}  ${r.amazon_asin}  ${r.name.slice(0, 60)}`);
    }
  }

  const toFix    = mismatches.filter(r => !takenSet.has(r.correct_asin));
  const toSkip   = mismatches.filter(r =>  takenSet.has(r.correct_asin));
  const fixIds   = toFix.map(r => r.id);

  console.log(`\n  Will fix:  ${toFix.length}`);
  console.log(`  Will skip: ${toSkip.length} (ASIN conflict with unaffected product)\n`);

  if (toFix.length === 0) {
    console.log("Nothing to fix after conflict check.");
    await pool.end();
    return;
  }

  // ── 3. NULL out all affected ASINs in one shot ───────────────────────────────
  const nullPlaceholders = fixIds.map(() => "?").join(",");
  await pool.execute(
    `UPDATE product SET amazon_asin = NULL WHERE id IN (${nullPlaceholders})`,
    fixIds
  );
  console.log(`Step 1: NULLed ${fixIds.length} ASINs`);

  // ── 4. Re-assign correct ASINs one by one (log any remaining conflicts) ──────
  let fixed = 0, failed = 0;
  for (const r of toFix) {
    try {
      await pool.execute(
        `UPDATE product SET amazon_asin = ? WHERE id = ?`,
        [r.correct_asin, r.id]
      );
      fixed++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ id=${r.id}  ${r.correct_asin}  FAILED: ${msg}`);
      failed++;
    }
  }

  console.log(`Step 2: Set ${fixed} ASINs, ${failed} failed\n`);

  // ── 5. Summary ───────────────────────────────────────────────────────────────
  console.log("═".repeat(60));
  console.log(`✅  Done`);
  console.log(`   Fixed:    ${fixed}`);
  console.log(`   Skipped:  ${toSkip.length} (ASIN conflict)`);
  console.log(`   Failed:   ${failed}`);
  if (toSkip.length > 0) {
    console.log("\nSkipped IDs (fix manually via admin):");
    for (const r of toSkip) {
      console.log(`   id=${r.id}  stored=${r.stored_asin} → correct=${r.correct_asin}`);
    }
  }
  console.log("═".repeat(60));

  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
