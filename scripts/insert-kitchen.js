const mysql = require('D:/Affiliate/backend/node_modules/mysql2/promise');

const products = [
  { asin:'B083C6XMKQ', name:'ATOM ALISTON K1 Digital Kitchen Weighing Scale 10kg Electronic Weight Machine', img:'71775fRr+gL', rating:4.2 },
  { asin:'B09J2T124D', name:'NutriPro Juicer Mixer Grinder Smoothie Maker 500W 2 Jars 1 Blade Silver', img:'71rH4vEE4nL', rating:4.4 },
  { asin:'B00YMJ0OI8', name:'Prestige PIC 20 1600W Induction Cooktop 4KV Surge Protection 8 Preset Indian Menus', img:'71+18JpxhOL', rating:4.0 },
  { asin:'B0C897PVVM', name:'AGARO Elite Rechargeable Mini Electric Chopper Food Grade Bowl Stainless Steel Blades', img:'71JxqRoEC9L', rating:4.2 },
  { asin:'B0BT1M24FN', name:'amazon basics Electric Egg Boiler 350W Boils Upto 7 Eggs Automatic Operation', img:'71p1L3X-ViL', rating:4.2 },
  { asin:'B0F54GKQ38', name:'Milton Rapid Electric Kettle 1.8L 1500W Stainless Steel Hot Water Portable Electric', img:'51lYFOP2mUL', rating:4.0 },
  { asin:'B0B257ZYVB', name:'AGARO Grand Egg Boiler Poacher 2-in-1 Boils 8 Eggs Poach 4 Eggs Steamed Vegetables', img:'81670ZfgQ-L', rating:4.3 },
  { asin:'B01GFTEV5Y', name:'Pigeon Cruise 1800W Induction Cooktop Crystal Glass 7 Segments LED Display', img:'61aM36RGwgL', rating:3.7 },
  { asin:'B0D14BB5XY', name:'PHILIPS Air Fryer 4.1L 1400W Digital Rapid Air Technology HD9200 Turbostar', img:'51CM1SXLDIL', rating:4.3 },
  { asin:'B07WMS7TWB', name:'Pigeon Amaze Plus Electric Kettle 1.5L 1300W Stainless Steel Auto Shut-off', img:'51DGcy8eBCL', rating:4.0 },
  { asin:'B08TTRVWKY', name:'Milton Smart Instant Electric Egg Boiler Automatic Cut Off Egg Cooker Steamer', img:'61mW-kbR6NL', rating:4.1 },
  { asin:'B071P7183Y', name:'AGARO Regency Multipurpose Kettle With Steamer 1.2L Double Layered Body Variable', img:'71a+McifdvL', rating:4.0 },
  { asin:'B0DJH2J2FC', name:'Sujata MG03 Mixer Grinder 1000W Double Ball Bearing Motor 24000 RPM 90 Mins Non-Stop', img:'61p+OliUqmL', rating:4.5 },
  { asin:'B07GMFY9QM', name:'SOFLIN Egg Boiler Electric Automatic Off 7 Egg Poacher Steaming Cooking Boiling', img:'41zR1WhC8eL', rating:4.0 },
  { asin:'B00A7PLVU6', name:'Orpat HHB-100E 250W Hand Blender White Kitchen Appliance', img:'31k3k6GUQXL', rating:4.2 },
  { asin:'B093ZZVMVW', name:'HealthSense Weight Machine Kitchen Food Weighing Scale Health Fitness Nutrition', img:'71VQ93ago8L', rating:4.1 },
  { asin:'B0B8XNPQPN', name:'Pigeon Healthifry Digital Air Fryer 360 High Speed Air Circulation 1200W', img:'71NZiryyhbL', rating:3.7 },
  { asin:'B0791GQRPF', name:'KENT Instant Egg Boiler 360W Boil 7 Eggs Automatic Shut-off Food Grade Material', img:'71JMli9dzfL', rating:4.2 },
  { asin:'B01GZSQJPA', name:'Philips HL7756 Mixer Grinder 750W 3 Stainless Steel Jars 5 Years Motor Warranty', img:'61YC2I7HqGL', rating:4.0 },
  { asin:'B0FCSN3CJZ', name:'CURAA ChopLab Lite Manual Vegetable Chopper Kitchen Chef Sanjyot Keer Mini Chopper', img:'71qELmK1QPL', rating:4.6 },
  { asin:'B091V8HK8Z', name:'Milton Go Electric Kettle 1.8L 3X Protection Dry Boil Auto Shut Off Keep Warm', img:'612jrIe9zEL', rating:4.1 },
  { asin:'B0DF6D49G7', name:'Milton Royal Express 800W Griller Sandwich Maker Toaster Auto Cut Off Non-Stick', img:'71hkTjamIEL', rating:4.1 },
  { asin:'B0D2NX639K', name:'SKADIOO Kitchen Weighing Scale SF-400 Weight Machine Food Kitchen Scale', img:'61WLHUnn+pL', rating:3.8 },
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
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, 14, '[]', '[]', NOW(), NOW(), NOW())`,
      [p.name, slug, `${p.name}. Top-selling kitchen appliance on Amazon India.`, image, link, p.asin, p.rating]
    );
    existingAsins.add(p.asin);
    inserted++;
  }

  const [cnt] = await conn.execute('SELECT COUNT(*) as c FROM product WHERE category_id = 14');
  console.log(`Done. Inserted: ${inserted}, Skipped: ${skipped}, Total in Kitchen Appliances: ${cnt[0].c}`);
  await conn.end();
})();
