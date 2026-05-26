/**
 * Daily price scraper — fetches current prices from Amazon India product pages
 * and updates the database. No Amazon PA API needed.
 *
 * Run manually:  node D:/Affiliate/scripts/scrape-prices.js
 * Schedule: add to Windows Task Scheduler or run via backend cron (see below)
 *
 * The backend also calls this logic via ENABLE_DAILY_CRON=true in .env
 * (hooks into daily-price-cron.ts which calls price-update.service.ts)
 */

const axios  = require('D:/Affiliate/backend/node_modules/axios');
const mysql  = require('D:/Affiliate/backend/node_modules/mysql2/promise');

const DB_URL   = 'mysql://affiliate_user:affiliate_pass123@localhost:3306/affiliate_db';
const DELAY_MS = 3000; // polite delay between Amazon requests

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-IN,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Cache-Control': 'max-age=0',
};

function parseDbUrl(url) {
  const m = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
  if (!m) throw new Error('Bad DB URL');
  return { user: m[1], password: m[2], host: m[3], port: parseInt(m[4]), database: m[5] };
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/**
 * Fetch current price for a single ASIN from Amazon India product page.
 * Returns price as number, or null if not found / blocked.
 */
async function fetchPrice(asin) {
  const url = `https://www.amazon.in/dp/${asin}`;
  try {
    const { data: html } = await axios.get(url, { headers: HEADERS, timeout: 15000, decompress: true });

    // Try multiple price selectors Amazon uses
    const patterns = [
      // Whole + fraction: <span class="a-price-whole">15,990</span>
      /a-price-whole[^>]*>[\s]*([\d,]+)/,
      // Single span with ₹
      /₹\s*([\d,]+(?:\.\d{2})?)/,
      // priceblock_ourprice
      /priceblock_ourprice[^>]*>[\s]*₹\s*([\d,]+)/,
      // corePrice_feature_div
      /corePrice_feature_div[^>]*>[\s\S]{0,300}₹\s*([\d,]+)/,
    ];

    for (const re of patterns) {
      const m = re.exec(html);
      if (m) {
        const price = parseFloat(m[1].replace(/,/g, ''));
        if (price > 0) return price;
      }
    }
    return null; // page loaded but no price found (out of stock / captcha)
  } catch {
    return null;
  }
}

(async () => {
  const conn = await mysql.createConnection(parseDbUrl(DB_URL));

  try {
    const [products] = await conn.execute(
      'SELECT id, amazon_asin, name, price FROM Product ORDER BY last_updated ASC'
    );

    console.log(`\n🔄 Price scraper starting — ${products.length} products\n`);

    let updated = 0, unchanged = 0, failed = 0;
    const startTime = Date.now();

    for (let i = 0; i < products.length; i++) {
      const { id, amazon_asin: asin, name, price: oldPrice } = products[i];
      process.stdout.write(`[${i + 1}/${products.length}] ${asin} — ${name.substring(0, 45)}... `);

      const newPrice = await fetchPrice(asin);

      if (newPrice === null) {
        process.stdout.write(`✗ no price\n`);
        failed++;
      } else if (Math.abs(newPrice - parseFloat(oldPrice)) < 0.5) {
        process.stdout.write(`= ₹${newPrice.toLocaleString('en-IN')}\n`);
        unchanged++;
      } else {
        await conn.execute(
          'UPDATE Product SET price = ?, last_updated = NOW() WHERE id = ?',
          [newPrice.toFixed(2), id]
        );
        process.stdout.write(`✓ ₹${parseFloat(oldPrice).toLocaleString('en-IN')} → ₹${newPrice.toLocaleString('en-IN')}\n`);
        updated++;
      }

      // Polite delay — skip after last item
      if (i < products.length - 1) await sleep(DELAY_MS);
    }

    const mins = ((Date.now() - startTime) / 60000).toFixed(1);
    console.log(`\n════ DONE in ${mins} min ════`);
    console.log(`✓ Updated:   ${updated}`);
    console.log(`= Unchanged: ${unchanged}`);
    console.log(`✗ Failed:    ${failed}`);
  } finally {
    await conn.end();
  }
})();
