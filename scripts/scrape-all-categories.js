/**
 * Scrapes Amazon India bestsellers for all 16 categories
 * Saves one CSV per category to D:/Affiliate/data/csv/
 * Run: node D:/Affiliate/scripts/scrape-all-categories.js
 */

const axios = require('D:/Affiliate/backend/node_modules/axios');
const fs = require('fs');
const path = require('path');

const PARTNER_TAG = 'adfirststore-21';
const OUT_DIR = 'D:/Affiliate/data/csv';
const DELAY_MS = 2800;
const TARGET = 50;

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-IN,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Cache-Control': 'max-age=0',
};

// All URLs verified via Amazon India bestsellers navigation
const CATEGORIES = [
  { id: 6,  name: 'Electronics',          slug: 'electronics',          url: 'https://www.amazon.in/gp/bestsellers/electronics/' },
  { id: 7,  name: 'Headphones',           slug: 'headphones',           url: 'https://www.amazon.in/gp/bestsellers/electronics/1388921031' },
  { id: 8,  name: 'Monitors',             slug: 'monitors',             url: 'https://www.amazon.in/gp/bestsellers/computers/1375425031' },
  { id: 9,  name: 'Smartphones',          slug: 'smartphones',          url: 'https://www.amazon.in/gp/bestsellers/electronics/1389432031' },
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

// Only re-scrape categories that had wrong URLs or < 40 products
// Set to null to scrape ALL categories
const RESCRAPE_SLUGS = null; // scrape all

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function slugToName(urlSlug) {
  // Convert URL slug to readable name: "Samsung-Galaxy-S25-Ultra" → "Samsung Galaxy S25 Ultra"
  return urlSlug.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractProducts(html, categoryId) {
  const products = [];
  const seen = new Set();

  // Strategy: use data-asin attribute Amazon puts on each product card container.
  // This guarantees name, image, price, rating all come from the SAME product's block.
  // Split HTML into per-product segments anchored on data-asin="ASIN".
  const dataAsinRe = /data-asin="([A-Z0-9]{10})"/g;
  let dm;
  const asinOffsets = []; // [{asin, offset}]

  while ((dm = dataAsinRe.exec(html)) !== null) {
    const asin = dm[1];
    if (!seen.has(asin)) {
      seen.add(asin);
      asinOffsets.push({ asin, offset: dm.index });
    }
  }

  for (let i = 0; i < asinOffsets.length; i++) {
    const { asin, offset } = asinOffsets[i];
    // Block = from this data-asin to the next one (or +4000 chars max)
    const nextOffset = asinOffsets[i + 1]?.offset ?? (offset + 4000);
    const block = html.slice(offset, Math.min(html.length, nextOffset));

    // Name: img alt is the full product title Amazon provides
    const altM = /alt="([^"]{8,})"/.exec(block);
    let name = altM ? altM[1]
      .replace(/&#x27;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .trim() : '';

    // Reject generic placeholder alt text
    if (!name ||
        name.toLowerCase().startsWith('product image') ||
        name.toLowerCase().startsWith('no image') ||
        name.toLowerCase() === 'image') {
      // Fallback: extract from URL slug in /dp/ link inside block
      const slugM = /href="\/([^"]+)\/dp\/[A-Z0-9]{10}/.exec(block);
      name = slugM ? slugToName(slugM[1].split('/')[0]) : '';
    }
    if (!name || name.length < 5) continue;

    // Price
    const priceM = /₹\s*([\d,]+(?:\.\d{2})?)/.exec(block);
    const price = priceM ? parseFloat(priceM[1].replace(/,/g, '')) : 0;

    // Image: prefer /images/I/HASH, always fallback to /P/ASIN
    const imgM = /src="(https:\/\/m\.media-amazon\.com\/images\/I\/[A-Za-z0-9%+_-]+\.[^"]+)"/.exec(block);
    let imageUrl = `https://m.media-amazon.com/images/P/${asin}._SL500_.jpg`; // safe default
    if (imgM) {
      const hashM = imgM[1].match(/\/images\/I\/([A-Za-z0-9%+_-]+)\./);
      if (hashM) imageUrl = `https://m.media-amazon.com/images/I/${hashM[1]}._SL500_.jpg`;
    }

    // Rating
    const ratingM = /(\d+\.?\d*)\s+out of\s+5/.exec(block) ||
                    /aria-label="(\d+\.?\d*)\s+out of\s+5"/.exec(block);
    const rating = ratingM ? parseFloat(ratingM[1]) : 0;

    const affiliateUrl = `https://www.amazon.in/dp/${asin}?tag=${PARTNER_TAG}`;
    products.push({ asin, name, price, rating, imageUrl, categoryId, affiliateUrl });
  }

  return products;
}

async function fetchPage(url) {
  const r = await axios.get(url, {
    headers: HEADERS,
    timeout: 20000,
    decompress: true,
  });
  return r.data;
}

function escCsv(v) {
  const s = String(v ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function toCsvRow(p) {
  return [p.asin, p.name, p.price, p.rating, p.imageUrl, p.categoryId, '', p.affiliateUrl]
    .map(escCsv).join(',');
}

function getPageUrl(base, page) {
  if (page === 1) return base;
  const sep = base.endsWith('/') ? '' : '/';
  return `${base}${sep}ref=zg_bs_pg_${page}?pg=${page}`;
}

async function scrapeCategory(cat) {
  const products = [];
  const seenAsins = new Set();
  let page = 1;

  while (products.length < TARGET && page <= 3) {
    const url = getPageUrl(cat.url, page);
    console.log(`  [${cat.name}] page ${page}`);
    try {
      const html = await fetchPage(url);
      const found = extractProducts(html, cat.id);
      let newCount = 0;
      for (const p of found) {
        if (!seenAsins.has(p.asin)) {
          seenAsins.add(p.asin);
          products.push(p);
          newCount++;
        }
      }
      console.log(`    → ${found.length} items, ${newCount} new, total ${products.length}`);
      if (found.length < 5) break;
      page++;
      if (products.length < TARGET) await sleep(DELAY_MS);
    } catch (e) {
      console.log(`    ✗ ${e.message}`);
      break;
    }
  }

  return products.slice(0, TARGET);
}

function writeCsv(cat, products) {
  const header = 'asin,name,price,rating,imageUrl,categoryId,description,affiliateUrl';
  const rows = products.map(toCsvRow);
  const csv = [header, ...rows].join('\n');
  const file = path.join(OUT_DIR, `${cat.slug}.csv`);
  fs.writeFileSync(file, csv, 'utf8');
  return file;
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const summary = [];

  const toScrape = RESCRAPE_SLUGS
    ? CATEGORIES.filter(c => RESCRAPE_SLUGS.includes(c.slug))
    : CATEGORIES;

  for (const cat of toScrape) {
    console.log(`\n▶ ${cat.name} (id=${cat.id})`);
    const products = await scrapeCategory(cat);
    const file = writeCsv(cat, products);
    const ok = products.length >= TARGET ? '✓' : '⚠';
    console.log(`  ${ok} ${products.length} products → ${path.basename(file)}`);
    // Preview first 2 names
    products.slice(0, 2).forEach((p, i) => console.log(`     ${i+1}. [${p.price}] ${p.name.substring(0,60)}`));
    summary.push({ category: cat.name, count: products.length, file });
    await sleep(DELAY_MS);
  }

  console.log('\n════ SUMMARY ════');
  for (const s of summary) {
    const ok = s.count >= TARGET ? '✓' : '⚠';
    console.log(`${ok} ${s.category}: ${s.count} → ${path.basename(s.file)}`);
  }
  const totalOk = summary.filter(s => s.count >= TARGET).length;
  console.log(`\n${totalOk}/${toScrape.length} categories at ${TARGET}+ products`);
  console.log(`CSVs in: ${OUT_DIR}`);
  console.log(`Upload each: Admin panel → CSV Import tab`);
})();
