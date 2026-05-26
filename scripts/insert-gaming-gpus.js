const mysql = require('D:/Affiliate/backend/node_modules/mysql2/promise');

// Real gaming hardware for Gaming category (id=13)
const gaming = [
  { asin:'B0D5J5XS36', name:'GIGABYTE GeForce RTX 3050 WINDFORCE OC 6G NVIDIA 6GB GDDR6 Gaming Graphics Card', img:'81fLtWboBxL', rating:4.4 },
  { asin:'B0BSN1QFXX', name:'MSI GeForce RTX 3050 Ventus 2X E 6G OC PCI-E Gaming Graphics Card NVIDIA 6GB', img:'716ZIsBcSQL', rating:4.5 },
  { asin:'B0FNM457WX', name:'ASUS AMD Dual Radeon RX 9060 XT 16GB GDDR6 Gaming Video Card DUAL-RX9060XT-16G', img:'51nKX+YKJ8L', rating:4.8 },
  { asin:'B0FH6JPVZB', name:'ZOTAC Gaming GeForce RTX 5060 Twin Edge 8GB GDDR7 DLSS4 Gaming Graphics Card', img:'71topOx+V9L', rating:4.7 },
  { asin:'B0DKPGQT97', name:'ASUS Dual Radeon RX 7600 EVO OC Edition 8GB GDDR6 AMD Gaming Graphics Card', img:'81QItJufypL', rating:4.7 },
  { asin:'B0BNP2CMXM', name:'GIGABYTE NVIDIA GeForce RTX 3060 WINDFORCE OC 12GB GDDR6 PCIe Gaming Graphics Card', img:'71OFKtclW4L', rating:4.5 },
  { asin:'B086ZSQZZ7', name:'ASUS Dual GeForce RTX 3050 OC Edition 6GB GDDR6 Gaming Graphics Card DUAL-RTX3050', img:'81mwcITtHBL', rating:4.6 },
  { asin:'B0DRPRZMK2', name:'Sapphire Pulse AMD Radeon RX 9070 XT Gaming 16GB GDDR6 PCIe Gaming Graphics Card', img:'719BQZ+2XGL', rating:4.7 },
  { asin:'B0F4ZFPVC1', name:'GIGABYTE GeForce RTX 5060 Ti WINDFORCE 2X OC 8GB GDDR6 Gaming Graphics Card', img:'713FHGuPERL', rating:4.2 },
  { asin:'B0DGT7B4JX', name:'ZEBRONICS GT740-4GD3 NVIDIA 4GB GDDR3 Gaming Graphics Card PCIe 3.0 HDMI VGA', img:'81WEGW4MxmL', rating:3.9 },
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
  for (const p of gaming) {
    if (existingAsins.has(p.asin)) { skipped++; continue; }
    const slug = toSlug(p.name, p.asin);
    const image = `https://m.media-amazon.com/images/I/${p.img}._SL500_.jpg`;
    const link = `https://www.amazon.in/dp/${p.asin}?tag=adfirststore-21`;
    try {
      await conn.execute(
        `INSERT INTO product (name, slug, description, image_url, affiliate_url, amazon_asin, price, rating, category_id, pros, cons, last_updated, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?, 13, '[]', '[]', NOW(), NOW(), NOW())`,
        [p.name, slug, `${p.name}. Best-selling gaming graphics card on Amazon India.`, image, link, p.asin, p.rating]
      );
      existingAsins.add(p.asin);
      inserted++;
    } catch(e) { if (e.code === 'ER_DUP_ENTRY') skipped++; else throw e; }
  }

  const [cnt] = await conn.execute('SELECT COUNT(*) as c FROM product WHERE category_id = 13');
  console.log(`Gaming: +${inserted} (skipped ${skipped}) → total ${cnt[0].c}`);
  await conn.end();
})();
