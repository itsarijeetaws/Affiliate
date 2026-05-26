const mysql = require('D:/Affiliate/backend/node_modules/mysql2/promise');

// Computer Peripherals — keyboards, mice, desk mats
const peripherals = [
  { asin:'B0CQRNWJM2', name:'ZEBRONICS Blanc Slim Wireless Mouse Rechargeable BT+2.4GHz 4 Buttons 800DPI', img:'51vMo-pHZ5L', rating:4.0 },
  { asin:'B01HJI0FS2', name:'Dell MS116 Wired Optical Mouse 1000 DPI USB Scrolling Wheel 2 Buttons', img:'51a1LryFTZS', rating:4.4 },
  { asin:'B0BG8LZNYL', name:'Portronics Toad One Bluetooth Mouse 2.4GHz BT 5.3 Dual Wireless 6 Buttons Rechargeable', img:'51hZtBRUFBL', rating:4.3 },
  { asin:'B0CP9NSXYJ', name:'Arctic Fox Pureview Transparent Wireless Bluetooth Rechargeable Mouse USB Receiver LED', img:'613dyv2wXdL', rating:4.4 },
  { asin:'B0FGVQBNSB', name:'Portronics Bubble 3.0 Wireless Keyboard Bluetooth+2.4GHz USB Rechargeable', img:'71z+UvKRg8L', rating:4.2 },
  { asin:'B0CV7XMKDJ', name:'STRIFF Desk Pad Protector Mouse Pad Non-Slip PU Leather Office Desk Mat', img:'71KEV8aETOL', rating:4.3 },
  { asin:'B00ZYLMQH0', name:'Dell KB216 Wired Multimedia Keyboard Full-Size USB Chiclet Keys', img:'61mwM6q4smL', rating:4.3 },
  { asin:'B0FDQ9M1SD', name:'Portronics Toad 8 Transparent Wireless Bluetooth Mouse Dual Wireless BT+2.4GHz', img:'61ILLwwQLLL', rating:4.5 },
  { asin:'B0CXDN7V9N', name:'STRIFF World Mouse Pad Premium Non-Slip Rubber Base Smooth Surface for Gaming Office', img:'61s6d6BxW4L', rating:4.4 },
  { asin:'B079Y6JZC8', name:'ZEBRONICS Zeb-Comfort Wired USB Mouse 3-Button 1000 DPI Optical Sensor Plug and Play', img:'51NCNxkQ-YL', rating:3.9 },
  { asin:'B098JYT4SY', name:'ZEBRONICS Zeb-Jaguar Wireless Mouse 2.4GHz USB Nano Receiver High Precision Optical', img:'61XtYoH-kGL', rating:3.9 },
  { asin:'B0D8KQK2CY', name:'ZEBRONICS MSP-X1 Mouse Pad Speed Precision Smooth Cloth Surface Rollable Large', img:'81VYnI9TEGL', rating:4.3 },
  { asin:'B0BRKSQ7Z2', name:'Portronics Toad 101 Wired Optical Mouse 1200 DPI Plug and Play Hi-Optical Tracking', img:'51czxrySrVL', rating:4.1 },
  { asin:'B08QJJCY2Q', name:'Tizum Mouse Pad Computer Mouse Mat Anti-Slip Rubber Base Smooth Mouse Control', img:'81ha67yYQuL', rating:4.4 },
  { asin:'B087FXHB6J', name:'ZEBRONICS Companion 107 2.4GHz Wireless Keyboard Mouse Combo 104 Keys UV Printed', img:'61ZvJw9wlXL', rating:3.5 },
  { asin:'B0827J11YM', name:'HP M120 Wireless Mouse USB-A Nano Dongle 2.4GHz 6 Buttons Ergonomic Design', img:'51+jHZifmkL', rating:3.7 },
  { asin:'B08NXD7MHC', name:'DailyObjects Large Premium Vegan Leather Desk Mat Anti-Skid 85x45cm Reversible', img:'61YKz5THoxL', rating:4.5 },
  { asin:'B0DSHZLRQB', name:'Ant Esports Prism Mouse Pad Anti-fray Stitching Waterproof Surface Non-Slip Rubber', img:'71EAZQiRqzL', rating:4.5 },
  { asin:'B0CZ7378GS', name:'Dyazo Large World Map Anti-Slip Extended Desk Mat Water Resistant for Laptop Keyboard', img:'71UsxJaDjxL', rating:4.4 },
  { asin:'B00MFPCY5C', name:'Gizga Essentials Universal Silicone Keyboard Protector Skin 15.6 Inch Laptop', img:'715FsUC9KnL', rating:3.5 },
  { asin:'B0DNP57PD9', name:'JAMJAKE iPad Pencil Stylus with 10 Min Faster Charge Compatible iPad 2024 2023 2022', img:'614u0c5xjAL', rating:4.3 },
  { asin:'B0CZ7378GS', name:'Dyazo Extended Mouse Pad with Anti-Slip Base World Map Design Large Desk Mat', img:'71UsxJaDjxL', rating:4.4 },
];

// Gaming products — controllers, headsets, gaming accessories
const gaming = [
  // From video games bestsellers
  { asin:'B0FRF4VSXC', name:'Sounce Anti-Slip Silicone PS5 Controller Skin Cover Non-Slip Grip Sleeve with Thumb Caps', img:'71xbdy-9ogL', rating:4.4 },
  { asin:'B0F674X8GP', name:'Sounce Glacier Pad RGB PS5 Cooling Stand Dual Controller Charging Station Vertical Stand', img:'71pngHvGYkL', rating:4.2 },
  { asin:'B0G2MKGDFD', name:'EDNITA Controller Cover PS5 Silicone Skin Non-Slip PS5 Controller Accessories', img:'61G1XFG4xiL', rating:4.3 },
  { asin:'B00Z0UWV3O', name:'Logitech G Driving Force Racing Wheel Shifter G29 G920 G923 6 Speed Push Down Reverse', img:'71cPMlKPk-L', rating:4.6 },
  { asin:'B0GN2F3JFY', name:'Meyaar Anti-Slip Silicone Cover PS5 Controller with Thumb Grip Caps Touchpad Sticker', img:'618PJaLIbDL', rating:4.4 },
  { asin:'B0GWWZZ294', name:'Axiora Studio Gaming Controller Stand Universal Display Holder PS5 Xbox Switch', img:'61746mKF3jL', rating:4.3 },
  // Gaming-specific keyboard/mice from peripherals page
  { asin:'B0FNDDJ1LV', name:'Sounce Dust Plug Set PS5 Slim Console 9 Pcs Silicone Plug Protector Kit', img:'61ifCtUPYuL', rating:4.2 },
  { asin:'B09GYF9Y6N', name:'GAMENOPHOBIA Thumbstick Caps Replacement Analog Joystick Caps Xbox One Controller', img:'31em6KfOi1L', rating:4.5 },
  { asin:'B0DK65QYJM', name:'Zyva Dual Controller Stand Universal Gaming Controller Desk Holder Display', img:'61q9558XbML', rating:4.5 },
  { asin:'B0CWS2R8LJ', name:'Brainwavz Plastic Game Controller Holder Wall Mount Stand for Xbox PS5', img:'61AXvwUMwZL', rating:4.3 },
  { asin:'B0G523X16M', name:'Wublue CurveDock Minimalist Controller Holder Desktop Stand Universal Gaming', img:'41AckrSmihL', rating:4.2 },
  { asin:'B01HJI0FS2', name:'Dell MS116 Wired Gaming Mouse 1000 DPI USB Optical Sensor Plug and Play', img:'51a1LryFTZS', rating:4.4 },
  // Root video games bestsellers
  { asin:'B0DSHZLRQB', name:'Ant Esports Prism Large Gaming Mouse Pad Anti-fray Stitching Waterproof Non-Slip', img:'71EAZQiRqzL', rating:4.5 },
  { asin:'B0FPGDWTDB', name:'Dhanishtha Double Controller Stand Desk Xbox Controller Gamepad Stand Gaming Desk', img:'710lCA17kAL', rating:4.5 },
  { asin:'B0F95ZTDSR', name:'Meyaar FPS Freek Galaxy Joystick Cap Cover PlayStation 4 PS4 PlayStation 5 PS5', img:'71LuSenKs4L', rating:4.4 },
];

function toSlug(name, asin) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 60) + '-' + asin.toLowerCase();
}

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost', user: 'affiliate_user',
    password: 'affiliate_pass123', database: 'affiliate_db'
  });

  // Create Computer Peripherals category if not exists
  const [catCheck] = await conn.execute("SELECT id FROM category WHERE slug='computer-peripherals'");
  let peripheralsCatId;
  if (catCheck.length === 0) {
    const [result] = await conn.execute(
      "INSERT INTO category (name, slug, description, createdAt, updatedAt) VALUES (?, ?, ?, NOW(), NOW())",
      ['Computer Peripherals', 'computer-peripherals', 'Keyboards, mice, desk mats and computer input devices']
    );
    peripheralsCatId = result.insertId;
    console.log('Created Computer Peripherals category, id:', peripheralsCatId);
  } else {
    peripheralsCatId = catCheck[0].id;
    console.log('Computer Peripherals category exists, id:', peripheralsCatId);
  }

  const [existing] = await conn.execute('SELECT amazon_asin FROM product');
  const existingAsins = new Set(existing.map(r => r.amazon_asin));

  // Insert peripherals
  let pInserted = 0, pSkipped = 0;
  const seenInScript = new Set();
  for (const p of peripherals) {
    if (existingAsins.has(p.asin) || seenInScript.has(p.asin)) { pSkipped++; continue; }
    seenInScript.add(p.asin);
    const slug = toSlug(p.name, p.asin);
    const image = `https://m.media-amazon.com/images/I/${p.img}._SL500_.jpg`;
    const link = `https://www.amazon.in/dp/${p.asin}?tag=adfirststore-21`;
    await conn.execute(
      `INSERT INTO product (name, slug, description, image_url, affiliate_url, amazon_asin, price, rating, category_id, pros, cons, last_updated, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, '[]', '[]', NOW(), NOW(), NOW())`,
      [p.name, slug, `${p.name}. Top computer peripheral on Amazon India.`, image, link, p.asin, p.rating, peripheralsCatId]
    );
    existingAsins.add(p.asin);
    pInserted++;
  }

  // Insert gaming
  let gInserted = 0, gSkipped = 0;
  for (const p of gaming) {
    if (existingAsins.has(p.asin) || seenInScript.has(p.asin)) { gSkipped++; continue; }
    seenInScript.add(p.asin);
    const slug = toSlug(p.name, p.asin);
    const image = `https://m.media-amazon.com/images/I/${p.img}._SL500_.jpg`;
    const link = `https://www.amazon.in/dp/${p.asin}?tag=adfirststore-21`;
    await conn.execute(
      `INSERT INTO product (name, slug, description, image_url, affiliate_url, amazon_asin, price, rating, category_id, pros, cons, last_updated, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, 13, '[]', '[]', NOW(), NOW(), NOW())`,
      [p.name, slug, `${p.name}. Popular gaming product on Amazon India.`, image, link, p.asin, p.rating]
    );
    existingAsins.add(p.asin);
    gInserted++;
  }

  const [pCnt] = await conn.execute(`SELECT COUNT(*) as c FROM product WHERE category_id = ${peripheralsCatId}`);
  const [gCnt] = await conn.execute('SELECT COUNT(*) as c FROM product WHERE category_id = 13');
  console.log(`Computer Peripherals: inserted ${pInserted}, skipped ${pSkipped}, total ${pCnt[0].c}`);
  console.log(`Gaming: inserted ${gInserted}, skipped ${gSkipped}, total ${gCnt[0].c}`);
  await conn.end();
})();
