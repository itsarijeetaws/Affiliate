const mysql = require('D:/Affiliate/backend/node_modules/mysql2/promise');

const products = [
  { asin:'B0F84FBWQM', name:'Samsung 80cm 32 inch HD Smart LED TV UA32H4550FUXXL', img:'71XA+N8Xj1L', rating:4.1 },
  { asin:'B0F43DMKDJ', name:'Samsung 108cm 43 inch Crystal 4K Vista Ultra HD Smart LED TV UA43UE81AFULXL', img:'81IzIFwBqpL', rating:4.0 },
  { asin:'B0F3JKY28G', name:'Xiaomi 108cm 43 inch FX Pro QLED Ultra HD 4K Smart Fire TV L43MB-FPIN', img:'81O3Otf3bPL', rating:4.2 },
  { asin:'B0DZHNQJQW', name:'TCL 80cm 32 inch V5C Series Full HD Smart QLED Google TV 32V5C', img:'71NudoyP-GL', rating:4.0 },
  { asin:'B0FCM61QWL', name:'VW 80cm 32 inch OptimaX Series HD Ready Smart QLED Android TV VW32AQ1', img:'810N4lyaYhL', rating:3.9 },
  { asin:'B0F6YZV4XW', name:'Xiaomi 80cm 32 inch A HD Ready Smart Google LED TV L32MB-AIN', img:'81Huedv6b-L', rating:4.0 },
  { asin:'B0F38M36TN', name:'TCL 139cm 55 inch 4K Ultra HD Smart QLED Google TV 55T8C', img:'81eJWtsCRkL', rating:4.1 },
  { asin:'B0F2J7JVR1', name:'TCL 108cm 43 inch 4K Ultra HD Smart LED Google TV 43V6C Metallic Bezel Less', img:'71wUKRGtLRL', rating:4.1 },
  { asin:'B0FDQY49H8', name:'Philips 109cm 43 inch 8100 Series 4K Ultra HD Smart QLED Google TV 43PQT8100', img:'81gySF32x7L', rating:4.1 },
  { asin:'B0F7X5FC43', name:'Sony 139cm 55 inch BRAVIA 2M2 Series 4K Ultra HD Smart Google TV XR-55X90L', img:'81Vs1ZXn43L', rating:4.6 },
  { asin:'B0F43CHDSN', name:'Samsung 138cm 55 inch Vision AI 4K Ultra HD Smart QLED TV QA55QEF1AULXL', img:'816jSKbarJL', rating:4.0 },
  { asin:'B0GJGCD8XY', name:'Uniboom Optima Series 80cm 32 inch HD Smart LED Android TV with Voice Command', img:'61GMKkMncJL', rating:4.2 },
  { asin:'B0F3HWNTR1', name:'TCL 139cm 55 inch 4K UHD Smart QD-Mini LED Google TV 55Q6C', img:'81PLRd3HtUL', rating:4.1 },
  { asin:'B0GS8X7H59', name:'Xiaomi 108cm 43 inch X Pro Series QLED 4K Ultra HD Smart Google TV L43MB-APIN', img:'711fcrtVLPL', rating:4.0 },
  { asin:'B0FG36RCLP', name:'Vu 108cm 43 inch GloQLED Series 4K QLED Smart Google TV 43GLOQLED25', img:'71VdAw8F+KL', rating:4.3 },
  { asin:'B0F6ZLFNVT', name:'Xiaomi 108cm 43 inch X Ultra HD 4K Smart Google LED TV L43MB-AIN', img:'81jqJ8elaHL', rating:4.1 },
  { asin:'B0F8BT3TQW', name:'VW 80cm 32 inch Pro Series HD Ready Smart QLED Google TV VW32F1', img:'81c3lUWivNL', rating:4.0 },
  { asin:'B0F39V7TSZ', name:'Lumio Vision 7 139cm 55 inch 4K Ultra-HD Smart QLED Google TV', img:'71jFENY4hgL', rating:4.2 },
  { asin:'B0F222CXK7', name:'Kodak QLED SE 80cm 32 inch QLED HD Ready Smart Linux TV 2025 Edition 32QSE5080', img:'71B5m2naG4L', rating:3.8 },
  { asin:'B0G6LYM6DY', name:'Philips 164cm 65 inch 4K Ultra HD QLED Smart QD-Mini LED Google TV 65MLED610', img:'81b5WyRiUnL', rating:4.4 },
  { asin:'B0FDBJB455', name:'VW 108cm 43 inch Nano Sync Series 4K Ultra HD Smart JioTele OS QLED TV VW43JQ1', img:'81Dc7MGS3YL', rating:3.8 },
  { asin:'B0DY7FPFLH', name:'LG 80cm 32 inch LR570 AI Series HD Ready Smart webOS LED TV 32LR570B6LA', img:'81NkpdByeNL', rating:4.2 },
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
    await conn.execute(
      `INSERT INTO product (name, slug, description, image_url, affiliate_url, amazon_asin, price, rating, category_id, pros, cons, last_updated, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, 11, '[]', '[]', NOW(), NOW(), NOW())`,
      [p.name, slug, `${p.name}. Top-selling Smart TV on Amazon India.`, image, link, p.asin, p.rating]
    );
    inserted++;
  }

  const [cnt] = await conn.execute('SELECT COUNT(*) as c FROM product WHERE category_id = 11');
  console.log(`Done. Inserted: ${inserted}, Skipped: ${skipped}, Total in Smart TVs: ${cnt[0].c}`);
  await conn.end();
})();
