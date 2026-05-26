const mysql = require('D:/Affiliate/backend/node_modules/mysql2/promise');

// All 30 from headphones bestsellers page — insert new ones only
const products = [
  { asin:'B0FMDL81GS', name:'OnePlus Nord Buds 3r TWS Earbuds 54H Playback 2-mic Clear Calls 3D Spatial Audio', img:'51nBTTG3hNL', rating:4.3 },
  { asin:'B0DDHM6D3L', name:'Portronics Conch Theta C in Ear Type C Wired Earphones HD Mic Powerful Audio', img:'51GGwjwSr0L', rating:4.1 },
  { asin:'B0DCNWN8NZ', name:'Apple EarPods USB-C Wired Earphones with Microphone for iPhone and iPad', img:'513OSdW4elL', rating:4.4 },
  { asin:'B0FM38916Y', name:'Boat Bassheads 300C Wired Earphones Type-C Jack 10mm Drivers Signature Sound In-Line Mic', img:'51sxI5xpalL', rating:4.0 },
  { asin:'B0FBRGKXHG', name:'OnePlus Bullets Wireless Z3 Neckband 12.4mm Drivers 3D Spatial Audio 10min Fast Charge', img:'51vT4GzBObL', rating:4.2 },
  { asin:'B08TV2P1N8', name:'Boat Rockerz 255 Pro+ 60H Battery Fast Charge IPX7 Dual Pairing Low Latency Magnetic', img:'61+SW9nDTEL', rating:4.0 },
  { asin:'B0D7HZ3KK9', name:'OnePlus Nord Buds 3 Pro TWS Bluetooth Earbuds 49dB Active Noise Cancellation', img:'51RaySTbIVL', rating:4.3 },
  { asin:'B0FC2YFSN4', name:'Boat Airdopes 219 4Mics ENx 40H Battery Best in Segment for Calling Stream Music', img:'61oPWuyuT2L', rating:3.9 },
  { asin:'B09R24HMNW', name:'ZEBRONICS Bro 3.5mm Wired in Ear Earphones In-Line Mic Deep Bass 1.2M Strong Cable', img:'61+5q4oGJWL', rating:3.5 },
  { asin:'B0DDHLPQT3', name:'Portronics Conch Theta A 3.5mm Wired Earphones HD Mic Powerful Audio In-Line Mic', img:'515OT+DhAuL', rating:4.1 },
  { asin:'B01DEWVZ2C', name:'JBL C100SI Wired In Ear Headphones Pure Bass One Button Multi-Function Remote', img:'51Q8DUDT2eL', rating:4.1 },
  { asin:'B0CQJZD55X', name:'Noise Buds N1 TWS Earbuds Chrome Finish 40H Playtime Quad Mic ENx Noise Cancellation', img:'51ptyuMXIeL', rating:3.8 },
  { asin:'B0DQ212KP4', name:'pTron Studio Evo 70H Wireless Over Ear Headphones HD Mic Low-Latency Gaming Mode', img:'51ZX74-s9DL', rating:4.1 },
  { asin:'B0DN1RPL19', name:'GOBOULT Mustang Torq Wireless Earbuds 60H Playtime App Support Quad Mic ENC', img:'71JsGjmlKKL', rating:4.0 },
  { asin:'B0FDGVNSLH', name:'Samsung Galaxy Buds Core In-Ear TWS ANC Enriched Bass Galaxy AI Enabled', img:'61WRrNa6BIL', rating:4.0 },
  { asin:'B071Z8M4KX', name:'Boat BassHeads 100 in-Ear Wired Headphones with Mic Powerful Bass', img:'513ugd16C6L', rating:4.1 },
  { asin:'B07L8KNP5F', name:'Zebronics Thunder Wireless Headphones BT v6.0 60H Playback 40mm Drivers Foldable', img:'61qArVOtW3L', rating:3.8 },
  { asin:'B0GQTSHLLR', name:'OnePlus Nord Buds 4 Pro TWS Earbuds 55dB Real-time ANC 12mm Titanium Drivers', img:'51LRQwB1VhL', rating:4.3 },
  { asin:'B0DL4S61RP', name:'Philips Audio TAE1159 in-Ear Wired Earphones Type-C Jack 10mm Drivers Inline Mic', img:'41gSn0Ykz7L', rating:3.9 },
  { asin:'B0BQN2RMJF', name:'GOBOULT Z40 True Wireless Earbuds 60H Playtime Zen ENC Mic Low Latency Gaming', img:'71rlmEZ6cjL', rating:3.9 },
  { asin:'B0D4QLT8WG', name:'Noise Buds N1 Pro TWS Earbuds Metallic Finish ANC 30dB 60H Playtime', img:'61UNThaGjYL', rating:3.8 },
  { asin:'B0DS2XNXZB', name:'Noise Buds VS102 Plus Wireless Earbuds 70H Playtime Quad Mic ENC Bluetooth', img:'61Sok9EsgjL', rating:3.6 },
  { asin:'B0FHW7PX1N', name:'Noise Buds VS601 True Wireless Earbuds 50H Playtime Transparent Design Bluetooth', img:'71g5FSQQl-L', rating:4.0 },
];

function toSlug(name, asin) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 60) + '-' + asin.toLowerCase();
}

// Gaming headsets to ALSO add to Gaming category (id=13)
const gamingHeadsets = ['B0DQ212KP4', 'B0BQN2RMJF', 'B07L8KNP5F'];

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
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, 7, '[]', '[]', NOW(), NOW(), NOW())`,
      [p.name, slug, `${p.name}. Best-selling headphones on Amazon India.`, image, link, p.asin, p.rating]
    );
    existingAsins.add(p.asin);
    inserted++;
  }

  // Add gaming headsets as duplicates in gaming category with different slugs
  let gInserted = 0;
  for (const p of products.filter(x => gamingHeadsets.includes(x.asin))) {
    const slug = toSlug('gaming-' + p.name, p.asin + 'g');
    const image = `https://m.media-amazon.com/images/I/${p.img}._SL500_.jpg`;
    const link = `https://www.amazon.in/dp/${p.asin}?tag=adfirststore-21`;
    // Check if already in gaming category
    const [gc] = await conn.execute('SELECT id FROM product WHERE amazon_asin=? AND category_id=13', [p.asin]);
    if (gc.length > 0) continue;
    // Use asin+'-g' trick won't work due to unique constraint. Skip — gaming already has 13 products.
    gInserted++;
  }

  const [hCnt] = await conn.execute('SELECT COUNT(*) as c FROM product WHERE category_id = 7');
  const [gCnt] = await conn.execute('SELECT COUNT(*) as c FROM product WHERE category_id = 13');
  console.log(`Headphones: inserted ${inserted}, skipped ${skipped}, total ${hCnt[0].c}`);
  console.log(`Gaming total: ${gCnt[0].c}`);
  await conn.end();
})();
