/**
 * Downloads each product image and removes products whose image is a
 * tiny placeholder (< 3 KB = Amazon returns a 1x1 or stub when product
 * is discontinued / out of stock / digital-only).
 *
 * Run: node D:/Affiliate/scripts/remove-no-image-products.js
 * Pass --dry-run to preview without deleting.
 */

const mysql = require('D:/Affiliate/backend/node_modules/mysql2/promise');
const axios  = require('D:/Affiliate/backend/node_modules/axios');

const DRY_RUN   = process.argv.includes('--dry-run');
const MIN_BYTES = 3000;   // images smaller than 3 KB = placeholder
const BATCH     = 15;     // concurrent requests
const TIMEOUT   = 10000;

const DB = { user:'affiliate_user', password:'affiliate_pass123', host:'localhost', port:3306, database:'affiliate_db' };

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'image/avif,image/webp,image/apng,*/*;q=0.8',
  'Referer': 'https://www.amazon.in/',
};

async function imageSize(url) {
  try {
    const r = await axios.default.get(url, {
      headers: HEADERS,
      responseType: 'arraybuffer',
      timeout: TIMEOUT,
      validateStatus: s => s === 200,
      maxContentLength: 500_000,
    });
    return r.data.byteLength;
  } catch {
    return 0;
  }
}

(async () => {
  const conn = await mysql.createConnection(DB);
  const [rows] = await conn.execute('SELECT id, amazon_asin, name, image_url FROM Product ORDER BY id');
  console.log(`\nChecking ${rows.length} product images (MIN_BYTES=${MIN_BYTES})...\n`);

  const toDelete = [];
  let checked = 0;

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    await Promise.all(batch.map(async p => {
      const bytes = await imageSize(p.image_url);
      checked++;
      if (bytes < MIN_BYTES) {
        toDelete.push({ id: p.id, asin: p.amazon_asin, name: p.name, bytes });
        process.stdout.write(`✗ ${p.amazon_asin} [${bytes}B] ${p.name.substring(0, 50)}\n`);
      }
    }));
    process.stdout.write(`  [${Math.min(i + BATCH, rows.length)}/${rows.length}]\r`);
  }

  process.stdout.write('\n');
  console.log(`\n────────────────────────────────`);
  console.log(`Checked:    ${checked}`);
  console.log(`Placeholder/broken: ${toDelete.length}`);
  console.log(`Keep:       ${checked - toDelete.length}`);

  if (toDelete.length === 0) {
    console.log('\nNothing to delete.');
    await conn.end();
    return;
  }

  if (DRY_RUN) {
    console.log('\n[DRY RUN] Would delete:');
    toDelete.forEach(p => console.log(`  id=${p.id} ${p.asin} ${p.name.substring(0, 60)}`));
  } else {
    const ids = toDelete.map(p => p.id);
    // Delete ProductFeature rows first (FK)
    await conn.execute(`DELETE FROM ProductFeature WHERE productId IN (${ids.join(',')})`);
    await conn.execute(`DELETE FROM Product WHERE id IN (${ids.join(',')})`);
    console.log(`\n✓ Deleted ${toDelete.length} products with placeholder images.`);
  }

  await conn.end();
})();
