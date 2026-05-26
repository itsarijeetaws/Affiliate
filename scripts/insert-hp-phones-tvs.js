const mysql = require('D:/Affiliate/backend/node_modules/mysql2/promise');

// Headphones page 2 (category 7)
const headphones = [
  { asin:'B07TFW1KML', name:'GOBOULT X1 Wired Earphones 10mm BassDriver Inline Control IPX5 Water Resistant', img:'71ENUgCNyHL', rating:4.0 },
  { asin:'B0BS1PRC4L', name:'Sony WH-CH520 Wireless Bluetooth Headphones On Ear 50H Battery Quick Charge', img:'41lArSiD5hL', rating:4.2 },
  { asin:'B0DV5J28LW', name:'Boat Rockerz 650 Pro Touch Controls Dolby Audio 80H Battery 2 Mics ENC', img:'61-XNG5lPBL', rating:4.2 },
  { asin:'B0GXL7B9FV', name:'GOBOULT Fluid X Wireless Headphones Bluetooth 60H Playtime 40mm Drivers Zen ENC Mic', img:'615ARblI-qL', rating:4.1 },
  { asin:'B0G599TLD9', name:'Portronics Muffs M6 Over Ear Wireless Bluetooth Headphone 40H Playtime Dual Mode', img:'61ZMTLmF4ZL', rating:4.3 },
  { asin:'B09CYX92NB', name:'JBL Tune 770NC Wireless Over Ear ANC Headphones 70H Battery Speed Charge', img:'61JU2HicMQL', rating:4.1 },
  { asin:'B0784BMDRW', name:'Sony MDR-ZX310AP Wired Headband Stereo On Ear Headset Black ZX Series', img:'51QTyJ107KL', rating:4.1 },
  { asin:'B08QTYYNDN', name:'JBL Tune 510BT On Ear Wireless Headphones 40H Playtime Pure Bass Quick Charge', img:'61kFL7ywsZS', rating:4.1 },
  { asin:'B0DCVPY1LV', name:'soundcore by Anker R50i True Wireless Earbuds 10mm Drivers Big Bass Bluetooth 5.3', img:'51lYR5xM97L', rating:4.1 },
];

// Smartphones page 2 (category 9)
const smartphones = [
  { asin:'B0CZKG6CVV', name:'Samsung Galaxy A16 5G Blue Black 8GB+128GB 50MP Triple Camera 5G Smartphone', img:'61y0C3mNPVL', rating:4.1 },
  { asin:'B0CY6DWHNT', name:'Redmi Note 14 5G Midnight Black 8GB+128GB 50MP AMOLED Display 5G Smartphone', img:'71iCFGHMgIL', rating:4.2 },
  { asin:'B0D3PYXBNJ', name:'OnePlus 13 12GB+256GB Midnight Ocean Snapdragon 8 Elite Hasselblad Camera 5G', img:'61jq6ZQHHIL', rating:4.5 },
  { asin:'B0CSKM3GCH', name:'Motorola Edge 50 Neo 12GB+256GB Camelia Red 6.4 inch pOLED 50MP Camera 5G', img:'71bLuBCiXHL', rating:4.2 },
  { asin:'B0D43RJN7B', name:'Samsung Galaxy S24 FE 8GB+128GB Blue 6.7 inch 50MP Triple Camera 5G Smartphone', img:'61bT7BoVkfL', rating:4.3 },
  { asin:'B0CXVLR5FP', name:'Redmi 14C 4GB+128GB Dreamy Purple 6.88 inch 50MP AI Camera 5000mAh Smartphone', img:'71Xs4-N5maL', rating:3.9 },
  { asin:'B0CPP6LQFJ', name:'Poco X7 Pro 5G 8GB+256GB Black Dimensity 9400 1.5K AMOLED 90W Fast Charge', img:'61J7fRQGi2L', rating:4.4 },
  { asin:'B0DQPB38YH', name:'iQOO Z9x 5G 6GB+128GB Pacific Blue Snapdragon 6s Gen 1 6000mAh Battery', img:'71xjgHGmxZL', rating:4.2 },
  { asin:'B0CL9NKZX5', name:'Motorola G85 5G 12GB+256GB Cobalt Blue 6.67 inch 50MP pOLED 5G Smartphone', img:'71sEqKJjyxL', rating:4.3 },
  { asin:'B0D6GKHGDL', name:'Samsung Galaxy M35 5G 8GB+128GB Icy Blue 6.6 inch 50MP Triple Camera 5G', img:'71iNLPEuLiL', rating:4.1 },
];

// Smart TVs page 2 (category 11)
const tvs = [
  { asin:'B0F9MMW1NN', name:'Samsung 108cm 43 inch Crystal 4K Neo Series Ultra HD Smart LED TV 2025', img:'81nqaJzr+QL', rating:4.2 },
  { asin:'B0BXHQD41Y', name:'Redmi Smart TV 80cm 32 inch HD Ready Google TV R32 2023 Edition', img:'71FzwYDdOaL', rating:4.1 },
  { asin:'B0CP2SY65T', name:'TCL 80cm 32 inch S5400 Full HD Smart Android TV with DTS & Dolby Audio', img:'71Wb+D+5JHL', rating:4.0 },
  { asin:'B0F5GXX2TZ', name:'Sony 80cm 32 inch BRAVIA W830N HD Ready Smart Google TV X-Reality Pro', img:'71z9jJ8bSmL', rating:4.4 },
  { asin:'B0CTHG3VY3', name:'LG 108cm 43 inch UR7500 4K Ultra HD Smart WebOS LED TV with ThinQ AI', img:'71Q9hCOFI5L', rating:4.2 },
  { asin:'B0F4RXQX39', name:'Vu 139cm 55 inch Premium 4K QLED Smart Google TV Quantum Luminit Technology', img:'81F8oEa3CHL', rating:4.3 },
  { asin:'B0C6G6XK6N', name:'Acer 80cm 32 inch I Series HD Ready Smart Android LED TV AR32AHX2851 Google', img:'71mRr7G5EHL', rating:3.9 },
  { asin:'B0CSCTVTYB', name:'Hisense 108cm 43 inch 4K Ultra HD Smart QLED Android TV 43A7KQ Dolby Vision', img:'81z6yCcKPQL', rating:4.1 },
  { asin:'B0CPJZMVZL', name:'iFFALCON 108cm 43 inch 4K Ultra HD Smart Google TV iFF43U62 Dolby Audio', img:'71BPhkl-JeL', rating:4.0 },
  { asin:'B0CZWFH1B5', name:'Realme 108cm 43 inch 4K Ultra HD Smart Android TV RMV2003 Google TV Dolby', img:'81v-j5T8fSL', rating:4.1 },
];

// Gaming extras — unique ASINs not yet in DB (category 13)
const gamingExtra = [
  { asin:'B0BS1PRC4L', name:'Sony WH-CH520 Wireless Gaming Headphones 50H Battery Lightweight On Ear BT', img:'41lArSiD5hL', rating:4.2 },
  { asin:'B09CYX92NB', name:'JBL Tune 770NC Wireless Gaming Headset ANC 70H Battery Speed Charge', img:'61JU2HicMQL', rating:4.1 },
  { asin:'B078HRR1XV', name:'Wacom CTL-472 Digital Drawing Graphics Pen Tablet Gaming Creative Small', img:'61CYV-pyToL', rating:4.3 },
];

// Kitchen +1 and Home Audio +1 using new ASINs
const kitchenOne = [
  { asin:'B0FCSN3CJZ', name:'CURAA ChopLab Lite Manual Vegetable Chopper Chef Sanjyot Keer Kitchen Chopper', img:'71qELmK1QPL', rating:4.6 },
  { asin:'B08TTRVWKY', name:'Milton Smart Instant Electric Egg Boiler Automatic Cut Off Egg Cooker Steamer', img:'61mW-kbR6NL', rating:4.1 },
];
const audioOne = [
  { asin:'B09B8XJDW5', name:'Amazon Echo Dot 5th Gen Smart Bluetooth Speaker Motion Detection Alexa Temp Sensor', img:'71MXrXqcyEL', rating:4.1 },
];

function toSlug(name, asin) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 60) + '-' + asin.toLowerCase();
}

async function insertBatch(conn, products, catId, existingAsins, label) {
  let inserted = 0, skipped = 0;
  for (const p of products) {
    if (existingAsins.has(p.asin)) { skipped++; continue; }
    const slug = toSlug(p.name, p.asin);
    const image = `https://m.media-amazon.com/images/I/${p.img}._SL500_.jpg`;
    const link = `https://www.amazon.in/dp/${p.asin}?tag=adfirststore-21`;
    try {
      await conn.execute(
        `INSERT INTO product (name, slug, description, image_url, affiliate_url, amazon_asin, price, rating, category_id, pros, cons, last_updated, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, '[]', '[]', NOW(), NOW(), NOW())`,
        [p.name, slug, `${p.name}. Popular product on Amazon India.`, image, link, p.asin, p.rating, catId]
      );
      existingAsins.add(p.asin);
      inserted++;
    } catch(e) { if (e.code === 'ER_DUP_ENTRY') skipped++; else throw e; }
  }
  const [cnt] = await conn.execute(`SELECT COUNT(*) as c FROM product WHERE category_id = ${catId}`);
  console.log(`${label}: +${inserted} (skipped ${skipped}) → total ${cnt[0].c}`);
}

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost', user: 'affiliate_user',
    password: 'affiliate_pass123', database: 'affiliate_db'
  });
  const [existing] = await conn.execute('SELECT amazon_asin FROM product');
  const existingAsins = new Set(existing.map(r => r.amazon_asin));

  await insertBatch(conn, headphones, 7, existingAsins, 'Headphones');
  await insertBatch(conn, smartphones, 9, existingAsins, 'Smartphones');
  await insertBatch(conn, tvs, 11, existingAsins, 'Smart TVs');
  await insertBatch(conn, gamingExtra, 13, existingAsins, 'Gaming');
  await insertBatch(conn, kitchenOne, 14, existingAsins, 'Kitchen');
  await insertBatch(conn, audioOne, 15, existingAsins, 'Home Audio');

  await conn.end();
})();
