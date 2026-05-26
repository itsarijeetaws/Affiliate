/**
 * Top-up categories that have fewer than MIN_COUNT products.
 * 1. Queries DB for per-category counts
 * 2. For each under-count category, scrapes Amazon bestsellers
 * 3. Verifies each product image is real (>= 3 KB)
 * 4. Upserts into DB via mysql2 (skips existing ASINs)
 *
 * Run: node D:/Affiliate/scripts/topup-categories.js [--dry-run]
 */

const mysql = require('D:/Affiliate/backend/node_modules/mysql2/promise');
const axios  = require('D:/Affiliate/backend/node_modules/axios');

const MIN_COUNT = 30;   // target minimum per category
const DRY_RUN   = process.argv.includes('--dry-run');
const MIN_BYTES = 3000; // < 3 KB = Amazon placeholder image
const DELAY_MS  = 2800;
const PARTNER_TAG = 'adfirststore-21';

const DB = {
  host: 'localhost', port: 3306,
  user: 'affiliate_user', password: 'affiliate_pass123',
  database: 'affiliate_db',
};

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-IN,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'max-age=0',
};
const IMG_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'image/avif,image/webp,image/apng,*/*;q=0.8',
  'Referer': 'https://www.amazon.in/',
};

// Same category list as scrape-all-categories.js
const CATEGORIES = [
  { id:  6, name: 'Electronics',          slug: 'electronics',          url: 'https://www.amazon.in/gp/bestsellers/electronics/' },
  { id:  7, name: 'Headphones',           slug: 'headphones',           url: 'https://www.amazon.in/gp/bestsellers/electronics/1388921031' },
  { id:  8, name: 'Monitors',             slug: 'monitors',             url: 'https://www.amazon.in/gp/bestsellers/computers/1375425031' },
  { id:  9, name: 'Smartphones',          slug: 'smartphones',          url: 'https://www.amazon.in/gp/bestsellers/electronics/1389432031' },
  { id: 10, name: 'Laptops',              slug: 'laptops',              url: 'https://www.amazon.in/gp/bestsellers/computers/1375424031' },
  { id: 11, name: 'Smart TVs',            slug: 'smart-tvs',            url: 'https://www.amazon.in/gp/bestsellers/electronics/15747864031' },
  { id: 12, name: 'Cameras',              slug: 'cameras',              url: 'https://www.amazon.in/gp/bestsellers/electronics/1388977031' },
  { id: 13, name: 'Gaming',               slug: 'gaming',               url: 'https://www.amazon.in/gp/bestsellers/videogames/' },
  { id: 14, name: 'Kitchen Appliances',   slug: 'kitchen-appliances',   url: 'https://www.amazon.in/gp/bestsellers/kitchen/' },
  { id: 15, name: 'Home Audio',           slug: 'home-audio',           url: 'https://www.amazon.in/gp/bestsellers/electronics/1389365031' },
  { id: 16, name: 'Smartwatches',         slug: 'smartwatches',         url: 'https://www.amazon.in/gp/bestsellers/watches/2563504031' },
  { id: 17, name: 'Grooming & Beauty',    slug: 'grooming',             url: 'https://www.amazon.in/gp/bestsellers/beauty/' },
  { id: 18, name: 'Power Banks',          slug: 'power-banks',          url: 'https://www.amazon.in/gp/bestsellers/electronics/6612025031' },
  { id: 19, name: 'Fitness & Sports',     slug: 'fitness',              url: 'https://www.amazon.in/gp/bestsellers/sports/' },
  { id: 20, name: 'Baby & Kids',          slug: 'baby-kids',            url: 'https://www.amazon.in/gp/bestsellers/baby/' },
  { id: 21, name: 'Computer Peripherals', slug: 'computer-peripherals', url: 'https://www.amazon.in/gp/bestsellers/computers/1375412031' },
];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Image verification ──────────────────────────────────────────────────────
async function checkImageBytes(url) {
  try {
    const r = await axios.default.get(url, {
      headers: IMG_HEADERS,
      responseType: 'arraybuffer',
      timeout: 10000,
      validateStatus: s => s === 200,
      maxContentLength: 500_000,
    });
    return r.data.byteLength;
  } catch { return 0; }
}

// ── HTML scraping ────────────────────────────────────────────────────────────
function extractProducts(html, categoryId) {
  const products = [];
  const seen = new Set();
  const dataAsinRe = /data-asin="([A-Z0-9]{10})"/g;
  let dm;
  const asinOffsets = [];

  while ((dm = dataAsinRe.exec(html)) !== null) {
    const asin = dm[1];
    if (!seen.has(asin)) { seen.add(asin); asinOffsets.push({ asin, offset: dm.index }); }
  }

  for (let i = 0; i < asinOffsets.length; i++) {
    const { asin, offset } = asinOffsets[i];
    const nextOffset = asinOffsets[i + 1]?.offset ?? (offset + 4000);
    const block = html.slice(offset, Math.min(html.length, nextOffset));

    const altM = /alt="([^"]{8,})"/.exec(block);
    let name = altM ? altM[1]
      .replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/&quot;/g, '"').trim() : '';

    if (!name || /^(product image|no image|image)$/i.test(name.trim())) {
      const slugM = /href="\/([^"]+)\/dp\/[A-Z0-9]{10}/.exec(block);
      name = slugM ? slugM[1].split('/')[0].replace(/-/g, ' ').trim() : '';
    }
    if (!name || name.length < 5) continue;

    const priceM = /₹\s*([\d,]+(?:\.\d{2})?)/.exec(block);
    const price = priceM ? parseFloat(priceM[1].replace(/,/g, '')) : 0;

    const imgM = /src="(https:\/\/m\.media-amazon\.com\/images\/I\/[A-Za-z0-9%+_-]+\.[^"]+)"/.exec(block);
    let imageUrl = `https://m.media-amazon.com/images/P/${asin}._SL500_.jpg`;
    if (imgM) {
      const hashM = imgM[1].match(/\/images\/I\/([A-Za-z0-9%+_-]+)\./);
      if (hashM) imageUrl = `https://m.media-amazon.com/images/I/${hashM[1]}._SL500_.jpg`;
    }

    const ratingM = /(\d+\.?\d*)\s+out of\s+5/.exec(block) ||
                    /aria-label="(\d+\.?\d*)\s+out of\s+5"/.exec(block);
    const rating = ratingM ? parseFloat(ratingM[1]) : 0;

    products.push({
      asin, name, price, rating, imageUrl, categoryId,
      affiliateUrl: `https://www.amazon.in/dp/${asin}?tag=${PARTNER_TAG}`,
    });
  }
  return products;
}

function getPageUrl(base, page) {
  if (page === 1) return base;
  const sep = base.endsWith('/') ? '' : '/';
  return `${base}${sep}ref=zg_bs_pg_${page}?pg=${page}`;
}

async function scrapeCategoryPages(cat, needCount, existingAsins) {
  /** Scrape up to 3 pages, skip existing ASINs, return raw products (not yet image-checked) */
  const results = [];
  const seenNow = new Set(existingAsins);
  let page = 1;

  while (results.length < needCount * 3 && page <= 3) { // collect 3x more than needed since image check will filter
    const url = getPageUrl(cat.url, page);
    process.stdout.write(`  page ${page}…`);
    try {
      const r = await axios.default.get(url, { headers: FETCH_HEADERS, timeout: 20000, decompress: true });
      const found = extractProducts(r.data, cat.id);
      let added = 0;
      for (const p of found) {
        if (!seenNow.has(p.asin)) {
          seenNow.add(p.asin);
          results.push(p);
          added++;
        }
      }
      process.stdout.write(` ${found.length} found, ${added} new (total new: ${results.length})\n`);
      if (found.length < 5) break;
      page++;
      if (page <= 3) await sleep(DELAY_MS);
    } catch (e) {
      process.stdout.write(` ✗ ${e.message}\n`);
      break;
    }
  }
  return results;
}

// ── Name → slug ──────────────────────────────────────────────────────────────
function makeSlug(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '-')
    .substring(0, 120);
}

// ── DB helpers ───────────────────────────────────────────────────────────────
async function getCategoryCounts(conn) {
  const [rows] = await conn.execute(`
    SELECT c.id, c.slug, c.name, COUNT(p.id) AS cnt
    FROM Category c
    LEFT JOIN Product p ON p.category_id = c.id
    GROUP BY c.id, c.slug, c.name
    ORDER BY cnt ASC
  `);
  return rows;
}

async function getExistingAsins(conn, categoryId) {
  const [rows] = await conn.execute(
    'SELECT amazon_asin FROM Product WHERE category_id = ?', [categoryId]
  );
  return new Set(rows.map(r => r.amazon_asin));
}

async function getAllAsins(conn) {
  const [rows] = await conn.execute('SELECT amazon_asin FROM Product');
  return new Set(rows.map(r => r.amazon_asin));
}

async function upsertProduct(conn, p, slug) {
  await conn.execute(`
    INSERT INTO Product
      (amazon_asin, name, slug, price, rating, image_url, category_id, description, pros, cons, affiliate_url, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, '', '[]', '[]', ?, NOW())
    ON DUPLICATE KEY UPDATE
      name         = VALUES(name),
      price        = VALUES(price),
      rating       = VALUES(rating),
      image_url    = VALUES(image_url),
      affiliate_url= VALUES(affiliate_url),
      updatedAt    = NOW()
  `, [p.asin, p.name, slug, p.price, p.rating, p.imageUrl, p.categoryId, p.affiliateUrl]);
}

// ── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  const conn = await mysql.createConnection(DB);
  console.log('\n═══ Category product counts ═══');
  const counts = await getCategoryCounts(conn);

  const allAsins = await getAllAsins(conn);

  for (const row of counts) {
    const current = Number(row.cnt);
    const suffix  = current < MIN_COUNT ? ` ← NEED ${MIN_COUNT - current} more` : '';
    console.log(`  [${current.toString().padStart(3)}] ${row.name}${suffix}`);
  }

  const toFill = counts.filter(r => Number(r.cnt) < MIN_COUNT);
  if (!toFill.length) {
    console.log('\n✓ All categories already have 30+ products.');
    await conn.end();
    return;
  }

  console.log(`\n${toFill.length} categorie(s) need top-up.\n`);

  let totalInserted = 0;

  for (const row of toFill) {
    const current = Number(row.cnt);
    const need = MIN_COUNT - current;
    console.log(`\n▶ ${row.name} [${current} → ${MIN_COUNT}] — need ${need} new with real images`);

    // Find matching category config for scraping URL
    const catCfg = CATEGORIES.find(c => c.id === row.id);
    if (!catCfg) {
      console.log('  ✗ No scraper config found, skipping.');
      continue;
    }

    // Use ALL existing ASINs (across all categories) to avoid cross-category stealing on upsert
    const candidates = await scrapeCategoryPages(catCfg, need, allAsins);

    if (!candidates.length) {
      console.log('  ✗ No new candidates scraped.');
      continue;
    }

    console.log(`  Checking images for ${candidates.length} candidates (need ${need} real ones)…`);

    // Verify images in batches of 10
    const BATCH = 10;
    const verified = [];
    for (let i = 0; i < candidates.length && verified.length < need; i += BATCH) {
      const batch = candidates.slice(i, i + BATCH);
      await Promise.all(batch.map(async p => {
        const bytes = await checkImageBytes(p.imageUrl);
        if (bytes >= MIN_BYTES) {
          verified.push({ ...p, bytes });
          process.stdout.write(`    ✓ ${p.asin} [${bytes}B] ${p.name.substring(0, 45)}\n`);
        } else {
          process.stdout.write(`    ✗ ${p.asin} [${bytes}B placeholder]\n`);
        }
      }));
      if (verified.length < need && i + BATCH < candidates.length) await sleep(500);
    }

    console.log(`  → ${verified.length} valid (needed ${need})`);

    if (DRY_RUN) {
      console.log(`  [DRY RUN] Would insert ${Math.min(verified.length, need)} products.`);
      continue;
    }

    // Insert valid products (up to `need` count)
    let inserted = 0;
    const toInsert = verified.slice(0, need);
    for (const p of toInsert) {
      let slug = makeSlug(p.name);
      // Ensure slug uniqueness — append asin suffix if slug already used
      if (allAsins.has(p.asin)) {
        // Existing product — upsert is fine, slug already exists
      } else {
        // Check slug collision with a simple suffix strategy
        const baseSlug = slug;
        let attempt = 0;
        while (true) {
          const [check] = await conn.execute('SELECT id FROM Product WHERE slug = ?', [slug]);
          if (!check.length) break;
          attempt++;
          slug = `${baseSlug}-${p.asin.toLowerCase().slice(-4)}${attempt > 1 ? attempt : ''}`;
        }
      }
      try {
        await upsertProduct(conn, p, slug);
        allAsins.add(p.asin);
        inserted++;
      } catch (e) {
        console.log(`    ✗ Insert failed for ${p.asin}: ${e.message}`);
      }
    }
    console.log(`  ✓ Inserted ${inserted} products into [${row.name}]`);
    totalInserted += inserted;

    if (toFill.indexOf(row) < toFill.length - 1) await sleep(DELAY_MS);
  }

  // Final count summary
  console.log('\n═══ Final counts ═══');
  const finalCounts = await getCategoryCounts(conn);
  for (const row of finalCounts) {
    const n = Number(row.cnt);
    const ok = n >= MIN_COUNT ? '✓' : '⚠';
    console.log(`  ${ok} [${n.toString().padStart(3)}] ${row.name}`);
  }

  console.log(`\nTotal new products inserted: ${totalInserted}`);
  if (DRY_RUN) console.log('[DRY RUN — nothing was actually written]');

  await conn.end();
})();
