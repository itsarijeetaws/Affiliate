const mysql = require('D:/Affiliate/backend/node_modules/mysql2/promise');

const products = [
  { asin:'B0F993RN8H', name:'Fire-Boltt Legacy Luxury Round Smart Watch 1.43" Super AMOLED, Bluetooth Calling, AI Voice, 120+ Sports, IP67', image:'81FZ9THFSYL', rating:3.8 },
  { asin:'B0BVR4DSGB', name:'Noise ColorFit Ultra 3 Bluetooth Calling Smart Watch 1.96" AMOLED, 100+ Watch Faces, SpO2, Sleep Tracking', image:'71Vx928Yx2L', rating:4.1 },
  { asin:'B0D6GFWYTQ', name:"Noise Pulse 4 Max Smart Watch with AI Create, 1.83\" HD Display, Bluetooth Calling, 100+ Sports Modes", image:'618L-zIgoRL', rating:4.0 },
  { asin:'B0D7MFV54Q', name:'Fastrack Radiant FX2 2.04" AMOLED Smart Watch, Bluetooth Calling, Voice Assistant, SpO2, IP68', image:'71vzcEJp9iL', rating:3.8 },
  { asin:'B0DWFQCY3V', name:'Huawei Band 10 Smart Fitness Band, AI Sleep Tracking, SpO2, Heart Rate, 14-Day Battery, Waterproof', image:'41abF4vT-OL', rating:4.0 },
  { asin:'B0CTCLBST5', name:'Samsung Galaxy Fit 3 Fitness Band, 13-Day Battery, 100+ Exercise Modes, Sleep Tracking, IP68, Heart Rate', image:'61K2qby-3oL', rating:4.2 },
  { asin:'B0GPDYDDZZ', name:'Boat Wave Sigma 3 Curv Smartwatch 2.01" Curved Display, Bluetooth Calling, SpO2, 100+ Sports Modes', image:'71JLQrCFF+L', rating:4.0 },
  { asin:'B0D6N5V9PY', name:'Noise Halo 2 Smart Watch Rotating Dial, 1.43" AMOLED, Bluetooth Calling, SpO2, Sleep Tracking', image:'71x2lrotvsL', rating:4.0 },
  { asin:'B0GVYWSJHY', name:'Titan Smart 4.0 Smartwatch 1.93" AMOLED, AI Watch Faces, Bluetooth Calling, SpO2, 14-Day Battery', image:'61BKoR6NGkL', rating:4.5 },
  { asin:'B0DT3YMDMZ', name:'Amazfit Active 2 Premium Smart Watch 44mm Sapphire Glass, GPS, AMOLED, Health Tracking, AI Features', image:'71XpjL4qkPL', rating:4.4 },
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
    const image = `https://m.media-amazon.com/images/I/${p.image}._SL500_.jpg`;
    const link = `https://www.amazon.in/dp/${p.asin}?tag=adfirststore-21`;
    await conn.execute(
      `INSERT INTO product (name, slug, description, image_url, affiliate_url, amazon_asin, price, rating, category_id, pros, cons, last_updated, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, 16, '[]', '[]', NOW(), NOW(), NOW())`,
      [p.name, slug, `${p.name}. Popular smartwatch on Amazon India.`, image, link, p.asin, p.rating]
    );
    inserted++;
  }

  const [cnt] = await conn.execute('SELECT COUNT(*) as c FROM product WHERE category_id = 16');
  console.log(`Done. Inserted: ${inserted}, Skipped: ${skipped}, Total in Smartwatches: ${cnt[0].c}`);
  await conn.end();
})();
