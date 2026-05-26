/**
 * Deletes ALL products from the database for a clean slate.
 * Run BEFORE uploading fresh CSVs from scrape-all-categories.js
 * Run: node D:/Affiliate/scripts/clean-products.js
 */

const mysql = require('D:/Affiliate/backend/node_modules/mysql2/promise');

const DB_URL = 'mysql://affiliate_user:affiliate_pass123@localhost:3306/affiliate_db';

function parseDbUrl(url) {
  const m = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
  if (!m) throw new Error('Bad DB URL');
  return { user: m[1], password: m[2], host: m[3], port: parseInt(m[4]), database: m[5] };
}

(async () => {
  const conn = await mysql.createConnection(parseDbUrl(DB_URL));
  try {
    const [[{ count }]] = await conn.execute('SELECT COUNT(*) as count FROM Product');
    console.log(`Found ${count} products in DB.`);

    if (count === 0) {
      console.log('Nothing to delete.');
      return;
    }

    // Also clear ProductFeature rows (FK constraint)
    const [[{ fCount }]] = await conn.execute('SELECT COUNT(*) as count FROM ProductFeature');
    if (fCount > 0) {
      await conn.execute('DELETE FROM ProductFeature');
      console.log(`Deleted ${fCount} product features.`);
    }

    await conn.execute('DELETE FROM Product');
    console.log(`✓ Deleted ${count} products. DB is clean.`);
    console.log('Now upload your 16 CSV files via Admin panel → CSV Import tab.');
  } finally {
    await conn.end();
  }
})();
