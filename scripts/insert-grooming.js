const mysql = require('D:/Affiliate/backend/node_modules/mysql2/promise');

const products = [
  { asin:'B09S6M7JQJ', name:'Ghar Soaps Sandalwood Saffron Magic Soaps For Bath 300g Pack of 3 Paraben Free', img:'718F+0RgtfL', rating:3.9 },
  { asin:'B000LQUA6M', name:'Simple Kind To Skin Refreshing Facial Wash 150ml Soap-Free Facewash Gentle Daily', img:'51wqZYWGr+L', rating:4.3 },
  { asin:'B0GYCT961V', name:'Ghar Soaps Magic De-Tan Face Wash Saffron Glutathione 100ml Tan Removal Brightening', img:'71x-JgwRslL', rating:4.4 },
  { asin:'B01CCGW4OE', name:'Cetaphil Gentle Skin Hydrating Face Wash 118ml Paraben Free Sulphate-Free Gentle', img:'61Ti2uv6V3L', rating:4.4 },
  { asin:'B09TZTHHBC', name:'Muuchstac Ocean Face Wash for Men Fight Acne Brighten Skin Clears Dirt Oil', img:'71ZrMvjZXZL', rating:4.0 },
  { asin:'B0B45RB1RV', name:'Deconstruct Gel Sunscreen Oily Skin SPF 50 PA++++ 100% Photostable 4 New Generation', img:'41Dbd5mjnfL', rating:4.3 },
  { asin:'B0B6Y3FNV7', name:'LOreal Paris Fresh Hyaluron Moisture 72HR Conditioner Hyaluronic Acid Sealing', img:'511fPrnY+bL', rating:4.4 },
  { asin:'B0BRJWZNVM', name:'Be Bodywise 4% AHA BHA Underarm Roll-On Even Tone Skin Lactic Mandelic Acid', img:'71waYmGy3EL', rating:4.3 },
  { asin:'B0F5BLYYCN', name:'Bare Anatomy Expert Scalp Care Shampoo Anti Dandruff Hair Fall Control Dermat Tested', img:'41aY2ihjX6L', rating:4.1 },
  { asin:'B07M9XYH9K', name:'Dettol Liquid Handwash Refill Skincare 1350ml pH Balanced 10x Better Germ Protection', img:'61cT-uFfHOL', rating:4.5 },
  { asin:'B07Q7C4Q45', name:'Scalpe Pro Daily Anti-Dandruff Shampoo Removes Dandruff Prevents Itching Seborrheic', img:'51vI5+Mb86L', rating:4.2 },
  { asin:'B0GY11K7X1', name:'LUMONY Ice Face Bowl Silicone Ice Bowl For Face Collapsible Built-In Ice Tray', img:'715BI9lCswL', rating:4.9 },
  { asin:'B0GK18G4V8', name:'RE EQUIL Ultra Matte Dry Touch Sunscreen SPF 50 PA++++ Water Sweat Resistant', img:'41ck8CmeVXL', rating:4.3 },
  { asin:'B0C9MRVXC2', name:'MARS Edge of Desire Lip Liner One Swipe Smooth Long Lasting Lip Pencil', img:'61rObY5jM0L', rating:4.4 },
  { asin:'B0D5DBMKMC', name:'Pilgrim 10% Vitamin C Face Serum Daily Brightness 10ml Glowing Skin Serum', img:'71WKftoavnL', rating:4.2 },
  { asin:'B0B6XQGXJW', name:'LOreal Paris Moisture Filling Shampoo Hyaluronic Acid Dry Dehydrated Hair', img:'51pruNF+rXL', rating:4.3 },
  { asin:'B0CJ5KRQ2D', name:'Sanfe Instant Tan Dead Skin Removal Exfoliating Gel AHA Exfoliant Tan Removal', img:'61-c5C3ocTL', rating:3.3 },
  { asin:'B0BLK4YRSN', name:'Dot Key Vitamin C E Super Bright Sunscreen SPF 50+ PA++++ In-Vivo Tested New-Age', img:'61ckTgN44WL', rating:4.2 },
  { asin:'B0BJQJCD87', name:'DERMATOUCH Bright Even Tone Face Wash Niacinamide Vitamin E Kojic Acid Gentle', img:'711wL0RX9OL', rating:4.1 },
  { asin:'B0F3DGBX4T', name:'Be Bodywise 5% AHA BHA De-Tan Exfoliating Body Wash 250ml Body Acne Strawberry Skin', img:'71S7D9nJ3rL', rating:4.3 },
  { asin:'B01LNA2MQK', name:'Dettol Liquid Handwash Refill Original 1350ml Germ Defence Formula 10x Better Protection', img:'61BacHKoINL', rating:4.5 },
  { asin:'B0CW1M1BC1', name:'Minimalist 10% Advanced Vitamin C Serum Glowing Skin Brightening Dark Spot Treatment', img:'61vmEu4MuZL', rating:4.1 },
  { asin:'B07VKM2HR5', name:'NIVEA Nourishing Body Milk 600ml Hyaluronic Acid 72Hr Hydration Deep Moisturizing', img:'61oRWpJlTVL', rating:4.4 },
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
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, 17, '[]', '[]', NOW(), NOW(), NOW())`,
      [p.name, slug, `${p.name}. Best-selling beauty and grooming product on Amazon India.`, image, link, p.asin, p.rating]
    );
    existingAsins.add(p.asin);
    inserted++;
  }

  const [cnt] = await conn.execute('SELECT COUNT(*) as c FROM product WHERE category_id = 17');
  console.log(`Done. Inserted: ${inserted}, Skipped: ${skipped}, Total in Grooming & Beauty: ${cnt[0].c}`);
  await conn.end();
})();
