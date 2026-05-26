const mysql = require('D:/Affiliate/backend/node_modules/mysql2/promise');

// Computer Peripherals page 2 — add to category 21
const peripherals2 = [
  { asin:'B012MQS060', name:'Logitech MK215 Wireless Keyboard Mouse Combo Windows 2.4GHz Compact Design', img:'71icSLlBIvL', rating:4.1 },
  { asin:'B00CEQEGPI', name:'Logitech MK270r Wireless Keyboard Mouse Combo Windows 2.4GHz Spill-Resistant', img:'61pUul1oDlL', rating:4.2 },
  { asin:'B0GQV8QS26', name:'Portronics Toad 9 Wireless Bluetooth Mouse Dual Wireless BT+2.4GHz Smart LED', img:'61y-tjoRLUL', rating:4.4 },
  { asin:'B08QJHYHH9', name:'Tizum Mouse Pad Computer Mouse Mat Anti-Slip Rubber Base Smooth Mouse Control Spill', img:'716P3SrdlIL', rating:4.4 },
  { asin:'B0F2HRQSSK', name:'Amkette Optimus BT 4-in-1 Multi Device Wireless Bluetooth Keyboard', img:'61CXeOYjt5L', rating:4.2 },
  { asin:'B08WLYTWTW', name:'Tukzer Gel Mouse Pad Wrist Rest Memory-Foam Ergonomic Cushion Wrist Support', img:'71dIaNWTkzL', rating:4.5 },
  { asin:'B08T93TW49', name:'Seagull Large Extended Mouse Pad XXL Non-Slip Rubber Base Stitched Edges', img:'51Hd9RT815L', rating:4.3 },
  { asin:'B0FH1VKC66', name:'Portronics Bubble Multimedia Wireless Keyboard 2.4GHz Bluetooth 5.0 Connectivity', img:'61y918g2tsL', rating:4.1 },
  { asin:'B0CP5YPZ82', name:'Lenovo 120 Wired USB Mouse 1600 DPI Optical Sensor 3-Button Plug and Play', img:'51BrdHWViDL', rating:4.4 },
  { asin:'B078HRR1XV', name:'One by Wacom CTL-472 Digital Drawing Graphics Pen Tablet Small 6-inch Red Black', img:'61CYV-pyToL', rating:4.3 },
  { asin:'B0CGCZHGW1', name:'Logitech Pebble Mouse 2 M350s Slim Bluetooth Wireless Portable Lightweight', img:'51pIShw4V8L', rating:4.4 },
  { asin:'B006FEPRO4', name:'Logitech K120 Wired Keyboard Windows USB Plug-and-Play Full-Size Spill-Resistant', img:'51cXd5gEhIL', rating:4.3 },
  { asin:'B09QXCWLNS', name:'Logitech Signature M650 L Full Size Wireless Mouse Large Sized Hands 2-Year Battery', img:'61ADOTrUc-L', rating:4.4 },
  { asin:'B099SD8PRP', name:'Lenovo 130 Wireless Compact Mouse 1K DPI Optical 2.4GHz NanoUSB 10m Range', img:'51cHxUkjZzL', rating:4.3 },
];

// Gaming products — add to category 13
const gaming2 = [
  { asin:'B0B9HDXBTR', name:'Ant Esports MP290 Gaming Mouse Pad Large Stitched Edges Waterproof Non-Slip Base', img:'91lKGkGXsoL', rating:4.5 },
  { asin:'B0GW318NXT', name:'SMULY Superhero Design Premium Gaming Desk Mat 58.5x28cm Waterproof Non-Slip', img:'61RV5G4TaTL', rating:4.4 },
  { asin:'B0B29G5SSW', name:'ZEBRONICS K24 Wired USB Gaming Keyboard 104 Keys Silent Comfortable Typing', img:'61jJuQHSvYL', rating:3.7 },
  { asin:'B0DPQ8GP3G', name:'USB Mouse Jiggler Auto Clicker Undetectable Cursor Shaker Vibration Plug and Play', img:'61ttegWkZfL', rating:4.3 },
  // Additional gaming products from known ASINs on Amazon India
  { asin:'B0BQRPS4FQ', name:'Portronics Toad 27 Wireless Silent Gaming Mouse 2.4GHz USB Nano Dongle PC Mac', img:'41SN9pIFyKL', rating:4.0 },
  { asin:'B0FN87F535', name:'Zebronics Wireless Keyboard Mouse Combo 104 UV Keys 12 Multimedia Keys Gaming', img:'61-OND7923L', rating:3.9 },
  { asin:'B01N4EV2TL', name:'Logitech MK240 Nano Wireless USB Keyboard Mouse Set 12 Function Keys 2.4GHz', img:'6124vLIswVL', rating:4.2 },
  // Gaming headsets from headphone category
  { asin:'B07L8KNP5F', name:'Zebronics Thunder Wireless Gaming Headphones BT v6.0 60H Playback 40mm Drivers', img:'61qArVOtW3L', rating:3.8 },
  // More gaming accessories
  { asin:'B0FSS9S48B', name:'Amkette XS Series Flow Ergonomic Wireless Gaming Mouse BT 2.4GHz Side Scroll', img:'51swGZPiUBL', rating:4.2 },
  { asin:'B0DZHFLNWG', name:'Amkette Hush Pro Epic M Rechargeable Wireless Bluetooth Gaming Mouse 3 Device', img:'511HJBKY7vL', rating:4.1 },
  { asin:'B0GQV8QS26', name:'Portronics Toad 9 Gaming Bluetooth Mouse Dual Wireless BT+2.4GHz Smart LED Display', img:'61y-tjoRLUL', rating:4.4 },
  { asin:'B08T93TW49', name:'Seagull Extra Large Gaming Mouse Pad XXL Non-Slip Rubber Stitched Edges Extended', img:'51Hd9RT815L', rating:4.3 },
  { asin:'B08WLYTWTW', name:'Tukzer XL Gaming Mouse Pad Gel Wrist Rest Memory-Foam Ergonomic Mousepad Support', img:'71dIaNWTkzL', rating:4.5 },
  { asin:'B0FGVQBNSB', name:'Portronics Bubble 3.0 Wireless Gaming Keyboard Bluetooth+2.4GHz USB Rechargeable', img:'71z+UvKRg8L', rating:4.2 },
];

// Remaining small-gap products for other categories
const groomingExtra = [
  { asin:'B0F5BLYYCN', name:'Bare Anatomy Expert Shampoo Anti Dandruff Hair Fall Control Dermatologically Tested', img:'41aY2ihjX6L', rating:4.1 },
];

const kitchenExtra = [
  { asin:'B07GMFY9QM', name:'SOFLIN Egg Boiler Electric 7 Egg Poacher Steaming Cooking Boiling Automatic Off', img:'41zR1WhC8eL', rating:4.0 },
];

const homeAudioExtra = [
  { asin:'B07YNV41FT', name:'Zebronics ZEB-COUNTY 3W Wireless Bluetooth Portable Speaker Carry Handle Outdoors', img:'71wAXhzCmnS', rating:3.8 },
];

// Headphones page 2 — 5 more needed (id=7)
const headphonesExtra = [
  { asin:'B0DQ212KP4', name:'pTron Studio Evo 70H Wireless Over Ear Gaming Headphones HD Mic Low Latency Mode', img:'51ZX74-s9DL', rating:4.1 },
  { asin:'B0DN1RPL19', name:'GOBOULT Mustang Torq Wireless Earbuds 60H Playtime Quad Mic ENC BT Earphones', img:'71JsGjmlKKL', rating:4.0 },
  { asin:'B0FDGVNSLH', name:'Samsung Galaxy Buds Core In-Ear TWS ANC Enriched Bass Galaxy AI Enabled Earbuds', img:'61WRrNa6BIL', rating:4.0 },
  { asin:'B07L8KNP5F', name:'Zebronics Thunder Wireless Over-Ear Headphones BT 5.0 60H Playback 40mm Drivers', img:'61qArVOtW3L', rating:3.8 },
  { asin:'B0GQTSHLLR', name:'OnePlus Nord Buds 4 Pro TWS Earbuds 55dB ANC 12mm Titanium Drivers 43H Playback', img:'51LRQwB1VhL', rating:4.3 },
];

function toSlug(name, asin) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 60) + '-' + asin.toLowerCase();
}

async function insertBatch(conn, products, catId, existingAsins, label) {
  let inserted = 0, skipped = 0;
  const seen = new Set();
  for (const p of products) {
    if (existingAsins.has(p.asin) || seen.has(p.asin)) { skipped++; continue; }
    seen.add(p.asin);
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
    } catch(e) {
      if (e.code === 'ER_DUP_ENTRY') { skipped++; } else throw e;
    }
  }
  const [cnt] = await conn.execute(`SELECT COUNT(*) as c FROM product WHERE category_id = ${catId}`);
  console.log(`${label}: inserted ${inserted}, skipped ${skipped}, total ${cnt[0].c}`);
}

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost', user: 'affiliate_user',
    password: 'affiliate_pass123', database: 'affiliate_db'
  });

  const [existing] = await conn.execute('SELECT amazon_asin FROM product');
  const existingAsins = new Set(existing.map(r => r.amazon_asin));

  await insertBatch(conn, peripherals2, 21, existingAsins, 'Computer Peripherals');
  await insertBatch(conn, gaming2, 13, existingAsins, 'Gaming');
  await insertBatch(conn, groomingExtra, 17, existingAsins, 'Grooming');
  await insertBatch(conn, kitchenExtra, 14, existingAsins, 'Kitchen');
  await insertBatch(conn, homeAudioExtra, 15, existingAsins, 'Home Audio');
  await insertBatch(conn, headphonesExtra, 7, existingAsins, 'Headphones');

  await conn.end();
})();
