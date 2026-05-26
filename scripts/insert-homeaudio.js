const mysql = require('D:/Affiliate/backend/node_modules/mysql2/promise');

const products = [
  { asin:'B0D772K8X8', name:'pTron Fusion Tunes 10W Mini Bluetooth Speaker Wireless Karaoke Mic 8H Playback', img:'61Lgfcc+o-L', rating:4.1 },
  { asin:'B09B8XJDW5', name:'Amazon Echo Dot 5th Gen Smart Speaker Motion Detection Temperature Sensor Vibrant Sound', img:'71MXrXqcyEL', rating:4.1 },
  { asin:'B0CH3G9VR2', name:'Boat Aavante Bar 490 10W Soundbar Dual Full-Range Drivers 7H Battery Built-in', img:'71-I9Bk8dgL', rating:4.1 },
  { asin:'B0FHHQQNZY', name:'Dubstep Pop 1400 14W Bluetooth Speaker Deep Bass XBASS 16H Playback Portable', img:'711x6ynULPL', rating:4.2 },
  { asin:'B097D69GJ1', name:'Portronics SoundDrum 1 12W TWS Portable Bluetooth Speaker Powerful Bass BT 5.0', img:'61ygYGBZUBL', rating:4.1 },
  { asin:'B0DJ3FFC8R', name:'ZEBRONICS Astra 35 16W Portable Bluetooth Speaker 8H Backup Dual Drivers', img:'71Gn7eWoLUL', rating:4.0 },
  { asin:'B0D6W6T95D', name:'Boat Stone 352 Pro 14W Bluetooth Speaker 12H Playback RGB LEDs Signature Sound', img:'81NueYBD9nL', rating:4.2 },
  { asin:'B078S4P3J9', name:'Tribit XSound Go Wireless Bluetooth 5.3 Speaker Loud Stereo Sound IPX7 Waterproof', img:'71b122pwbpL', rating:4.4 },
  { asin:'B07YNV41FT', name:'Zebronics ZEB-COUNTY 3W Wireless Bluetooth Portable Speaker with Carry Handle', img:'71wAXhzCmnS', rating:3.8 },
  { asin:'B09NCFVNK9', name:'JBL Go Essential Wireless Ultra Portable Bluetooth Speaker Vibrant Colors Waterproof', img:'71uji1ExbsL', rating:4.2 },
  { asin:'B0FVG8H8SM', name:'Portronics Apollo 30W Wireless Bluetooth Portable Speaker Karaoke Mic Echo Effect', img:'81QWMNsTNdL', rating:4.2 },
  { asin:'B09V2J596T', name:'Portronics SoundDrum P 20W Bluetooth Speaker 6-7H Playback Handsfree Calling', img:'71zoEeTAszL', rating:4.3 },
  { asin:'B09V7WS4PP', name:'JBL Flip 6 Wireless Portable Bluetooth Speaker Pro Sound 12H Playtime IP67 Waterproof', img:'81nT721hWGL', rating:4.4 },
  { asin:'B0DH8FHY3S', name:'Blaupunkt ATOMIK Grab 20W Party Speaker Boombox Loud Clear Music 2025', img:'613LNL9foqL', rating:4.3 },
  { asin:'B0CR1NWYLD', name:'ZEBRONICS Juke BAR 3902 Soundbar 140W HDMI ARC Optical USB AUX Bluetooth', img:'71btr99Q7XL', rating:4.0 },
  { asin:'B0F8W3VKDZ', name:'PHILIPS TAS1400 12W Wireless Bluetooth Speaker Deep Bass Passive Radiator', img:'712kYGkeC9L', rating:4.0 },
  { asin:'B0DJP7ZFTW', name:'ZEBRONICS VITA BAR 150 20W Soundbar 2.0 Channel Dual 52mm Drivers Bluetooth', img:'71Tu1SzRh4L', rating:3.7 },
  { asin:'B0D45Y8313', name:'JBL Cinema SB510 Dolby Audio Soundbar Built-in Subwoofer 3.1 Channel Deep Bass', img:'51-XdcfhCJL', rating:3.9 },
  { asin:'B0F5BDTR4K', name:'Boat Aavante 2.1 1200 120W Soundbar 2.1CH Wired Subwoofer BT v5.4 Multiple Playback', img:'51-ZeIoNF8L', rating:4.2 },
  { asin:'B0F7XNF1QF', name:'ZEBRONICS 90W Compact Soundbar Home Theatre Dual Driver 11.43cm Subwoofer', img:'71+Y1B4HaqL', rating:4.0 },
  { asin:'B0CXL4FQBK', name:'Sony ULT Field 1 Wireless Bluetooth Speaker 12H Playtime Massive Bass Hands Free', img:'81Tw+kmH9RL', rating:4.6 },
  { asin:'B0BZ4DJ7GZ', name:'Boat Aavante Bar 610 25W Soundbar 2.0CH Dual Passive Radiators 7H Battery', img:'51SFh0i5HHL', rating:4.0 },
  { asin:'B0DH8CDH9J', name:'Boat Stone 193 Pro 5W Portable Bluetooth Speaker 12H Playback TWS Feature', img:'81M4DVkAbPL', rating:3.9 },
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
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, 15, '[]', '[]', NOW(), NOW(), NOW())`,
      [p.name, slug, `${p.name}. Best-selling home audio speaker on Amazon India.`, image, link, p.asin, p.rating]
    );
    existingAsins.add(p.asin);
    inserted++;
  }

  const [cnt] = await conn.execute('SELECT COUNT(*) as c FROM product WHERE category_id = 15');
  console.log(`Done. Inserted: ${inserted}, Skipped: ${skipped}, Total in Home Audio: ${cnt[0].c}`);
  await conn.end();
})();
