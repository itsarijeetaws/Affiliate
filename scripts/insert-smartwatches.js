const mysql = require('D:/Affiliate/backend/node_modules/mysql2/promise');

const products = [
  { asin:'B0DTB3JSVV', name:'Fire-Boltt Ninja Call Pro Plus Smart Watch 1.83" HD Display, Bluetooth Calling, AI Voice, 120+ Sports, IP67', image:'61sHlVy7dML', rating:3.9 },
  { asin:'B0CQ4KTCH1', name:'Noise Twist Go Smartwatch 1.39" Metal Build, BT Calling, IP68, 100+ Sports Modes, Sleep Tracking (Jet Black)', image:'61BoaOUf+KL', rating:4.0 },
  { asin:'B0D9629NJQ', name:'Fastrack Limitless Glide X Smart Watch 1.83" Ultra UV HD, Bluetooth Calling, SpO2, 100+ Sports, 5-Day Battery', image:'71rNSvzQGlL', rating:4.0 },
  { asin:'B0CMF25TKG', name:'Fire-Boltt Rise Smart Watch 1.85" HD Display, Bluetooth Calling, Rotating Crown, SpO2, 120+ Sports, IP67', image:'61IGSSfF-JL', rating:4.0 },
  { asin:'B0DTB2VQFZ', name:'Fire-Boltt Phoenix Pro Round Smart Watch 1.39" Bluetooth Calling, AI Voice, SpO2, 120+ Sports, IP67 Metal', image:'717+Bu7jtLL', rating:3.7 },
  { asin:'B0CG1VX5P4', name:'Fire-Boltt Talk Round Smart Watch 1.39" Bluetooth Calling, SpO2, Heart Rate, 123 Sports Modes, IP67', image:'71uRJs56VAL', rating:4.0 },
  { asin:'B0DGGVHMDS', name:'Fastrack Astor FR2 Pro 1.43" AMOLED Stainless Steel, Bluetooth Calling, GPS, IP68 Smartwatch', image:'71rjlGEi+1L', rating:4.3 },
  { asin:'B0BY2PWDFQ', name:'Fire-Boltt Phoenix Ultra Smart Watch 1.39" AMOLED Display, Bluetooth Calling, SpO2, 120+ Sports, IP67', image:'819DWQLgjKL', rating:3.9 },
  { asin:'B0FLF44GTQ', name:'Boat Wave Call 3 Smartwatch 1.83" HD Display, Bluetooth Calling, SpO2, Heart Rate, 100+ Sports Modes', image:'71UdDIKDlEL', rating:4.1 },
  { asin:'B0F8J8J9TN', name:'Noise Pulse Hyper Smart Watch 21 Days Battery, 1.96" AMOLED, Bluetooth Calling, 100+ Sports Modes', image:'61ehilHb3tL', rating:4.0 },
  { asin:'B0FC6CGZTP', name:'Noise Junior Explorer 2 Smart Watch for Kids, GPS, SOS Calling, 1.69" HD Display, IP68', image:'617JeTY4LgL', rating:4.1 },
  { asin:'B0GH7NP9VB', name:'Fire-Boltt Phoenix Air Smart Watch 1.26" Bluetooth Calling, SpO2, Heart Rate, 120+ Sports Modes', image:'61inWFiwf3L', rating:4.0 },
  { asin:'B0GG4W7N66', name:'Pebble Qore 2 Premium Metal Smartwatch 1.43" AMOLED, Bluetooth Calling, Health Tracking', image:'71KDdMgGJ4L', rating:3.8 },
  { asin:'B0G61F9SDY', name:'Fire-Boltt Ninja X Ring Smart Watch 1.43" AMOLED, Rotating Ring, Bluetooth Calling, IP68', image:'61wT6-UtrlL', rating:4.1 },
  { asin:'B0GLPF5GBP', name:'Fastrack Jupiter R3 1.38" Ultra UV Round Smartwatch, Bluetooth Calling, AMOLED, IP68, SpO2', image:'61-VJoyV5JL', rating:4.2 },
  { asin:'B0FDQJSPJK', name:'Samsung Galaxy Watch 8 40mm Bluetooth Smartwatch, Health Monitoring, Fitness Tracking, Sleep Coaching', image:'619tP9hJ1sL', rating:4.3 },
  { asin:'B0BN1ZG1QZ', name:'NoiseFit Halo 1.43" AMOLED Bluetooth Calling Smartwatch, Sleep Tracking, 100+ Sports Modes', image:'71aTghUQfqL', rating:4.0 },
  { asin:'B0F8JF1R8X', name:'Noise Twist 2 Smart Watch 1.43" AMOLED, Bluetooth Calling, SpO2, 100+ Sports, Advanced Health Suite', image:'61r0qYy7jZL', rating:4.1 },
  { asin:'B0CG1Y3336', name:'Noise Vortex Plus 1.46" AMOLED Smartwatch, Always-on Display, Bluetooth Calling, 100+ Sports Modes', image:'61QiBo-sPTL', rating:4.0 },
  { asin:'B0FP2H4K27', name:'Fire-Boltt Axiom Round Smart Watch 1.43" AMOLED, Bluetooth Calling, SpO2, 120+ Sports Modes', image:'71gdP7CfeiL', rating:3.8 },
  { asin:'B0DH2SPVZC', name:'Redmi Watch 5 Lite 1.96" AMOLED, Advanced Health Tracking, Bluetooth Calling, GPS, 18-Day Battery', image:'71qq-p26D4L', rating:4.1 },
];

function toSlug(name, asin) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 60) + '-' + asin.toLowerCase();
}

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost', user: 'affiliate_user',
    password: 'affiliate_pass123', database: 'affiliate_db'
  });

  // Check existing ASINs globally (unique constraint)
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
      [p.name, slug, `${p.name}. Top-rated smartwatch available on Amazon India.`, image, link, p.asin, p.rating]
    );
    inserted++;
  }

  const [cnt] = await conn.execute('SELECT COUNT(*) as c FROM product WHERE category_id = 16');
  console.log(`Done. Inserted: ${inserted}, Skipped: ${skipped}, Total in Smartwatches: ${cnt[0].c}`);
  await conn.end();
})();
