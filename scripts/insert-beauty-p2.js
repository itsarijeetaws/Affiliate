const mysql = require('D:/Affiliate/backend/node_modules/mysql2/promise');

const products = [
  { asin:'B0744GC2CK', name:'LOreal Professionnel Absolut Repair Shampoo Dry Damaged Hair Professional 300ml', img:'61mjVFw8m8L', rating:4.2 },
  { asin:'B0C3CP6B5Y', name:'Foxtale Glow Sunscreen SPF 50 PA++++ Vitamin C Niacinamide In-Vivo Tested', img:'61ksUlFtRQL', rating:4.2 },
  { asin:'B0D6G1JFZ2', name:'Pilgrim Australian Tea Tree Anti-Dandruff Shampoo 200ml Removes Dandruff', img:'61XlgvckwCL', rating:4.2 },
  { asin:'B09Q3MWP2S', name:'Minimalist Vitamin B5 10% Oil-Free Moisturizer Lightweight Gel Moisturizer Face', img:'51g9c5DjXpL', rating:4.2 },
  { asin:'B07D9GF1NW', name:'NIVEA MEN Deep Impact Freshness Roll On Deodorant Black Carbon 48H Protection', img:'51kZ0bEXlYL', rating:4.3 },
  { asin:'B00E96N6O8', name:'NIVEA Soft Moisturizing Cream 72Hr Hydration Lightweight Non-Sticky Daily', img:'51qu97DFTjL', rating:4.4 },
  { asin:'B0FCMZSB8K', name:'Foxtale Super Glow Detan Face Wash Vitamin C Papaya Enzyme Tan Removal Brightens', img:'61XtyIr8CUL', rating:4.1 },
  { asin:'B0CW1N7QRT', name:'WishCare Niacinamide Oil Balance Sunscreen SPF 50 PA++++ 8Hrs+ SPF Protection', img:'61wtcs2EOPL', rating:4.5 },
  { asin:'B006LX9K92', name:'Garnier Skin Naturals Facewash Cleansing Brightening Bright Complete 100g', img:'61Vp0-XHx2L', rating:4.2 },
  { asin:'B00YJJWBUA', name:'Maybelline Color Sensational Creamy Matte Lipstick 12H Hydration 36 Shades', img:'51Fs39k8fCL', rating:4.1 },
  { asin:'B00HT03SJY', name:'NIVEA Men Fresh Active Deodorant Spray 150ml 48H Active Odour Protection', img:'51UsN0JYrGL', rating:4.1 },
  { asin:'B07S7R626P', name:'DOVE Nourishing Bodywash 825ml Soft Smooth Skin Triple Hydration Serum', img:'517NDeSj-4L', rating:4.4 },
  { asin:'B09Z6TJP7Y', name:'Ponds Super Light Gel Oil Free Face Moisturizer 200g Cera-Hyamino Ultimate Soft', img:'51ibrlV3I+L', rating:4.4 },
];

function toSlug(name, asin) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 60) + '-' + asin.toLowerCase();
}

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost', user: 'affiliate_user',
    password: 'affiliate_pass123', database: 'affiliate_db'
  });

  const [existing] = await conn.execute('SELECT amazon_asin FROM product');
  const existingAsins = new Set(existing.map(r => r.amazon_asin));

  let inserted = 0, skipped = 0;
  for (const p of products) {
    if (existingAsins.has(p.asin)) { skipped++; continue; }
    const slug = toSlug(p.name, p.asin);
    const image = `https://m.media-amazon.com/images/I/${p.img}._SL500_.jpg`;
    const link = `https://www.amazon.in/dp/${p.asin}?tag=adfirststore-21`;
    try {
      await conn.execute(
        `INSERT INTO product (name, slug, description, image_url, affiliate_url, amazon_asin, price, rating, category_id, pros, cons, last_updated, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?, 17, '[]', '[]', NOW(), NOW(), NOW())`,
        [p.name, slug, `${p.name}. Best-selling beauty product on Amazon India.`, image, link, p.asin, p.rating]
      );
      existingAsins.add(p.asin);
      inserted++;
    } catch(e) { if (e.code === 'ER_DUP_ENTRY') skipped++; else throw e; }
  }

  const [cnt] = await conn.execute('SELECT COUNT(*) as c FROM product WHERE category_id = 17');
  console.log(`Grooming & Beauty: inserted ${inserted}, skipped ${skipped}, total ${cnt[0].c}`);
  await conn.end();
})();
