const mysql = require('D:/Affiliate/backend/node_modules/mysql2/promise');

const products = [
  { asin:'B0GVYDLJJQ', name:'OnePlus Nord CE6 Lite 6GB+128GB Hyper Black, Dimensity 7400, 5G Smartphone', img:'61T18EfkX0L', rating:4.0 },
  { asin:'B0GWLJL55D', name:'OnePlus Nord CE6 8GB+256GB Pitch Black, Snapdragon 7s Gen 4, 5G Smartphone', img:'61Di24QT6GL', rating:4.0 },
  { asin:'B0FN7RN9TH', name:'Samsung Galaxy M17 5G Sapphire Black 4GB+128GB, 50MP OIS Triple Camera Smartphone', img:'7101h6htEgL', rating:4.1 },
  { asin:'B0GRBBPBGQ', name:'OnePlus Nord 6 8GB+256GB Fresh Mint, Snapdragon 8s Gen 4, 165Hz Display 5G Smartphone', img:'61F1NWYtCKL', rating:4.3 },
  { asin:'B0FHB5V36G', name:'iQOO Z10R 5G Aquamarine 8GB+128GB, 32MP 4K Selfie, Quad-Curved AMOLED Display', img:'61WM6IDaBPL', rating:4.4 },
  { asin:'B0FN7QTRPY', name:'Samsung Galaxy M07 Black 4GB+64GB, MediaTek Helio G99, 5G Smartphone', img:'610lbucItmL', rating:4.2 },
  { asin:'B0GS5Y6BD3', name:'Redmi A7 Pro 5G Mist Blue 4GB+128GB, Segment Fastest Processor Smartphone', img:'71eQsL8sqcL', rating:3.5 },
  { asin:'B0F43VZ4H1', name:'Samsung Galaxy M56 5G Light Green 8GB+128GB, Slimmest, Gorilla Glass Smartphone', img:'71PQ2tp0jwL', rating:4.3 },
  { asin:'B0GP8XTH7K', name:'iQOO Z11x 5G Prismatic Green 8GB+256GB, Dimensity 7400-Turbo, 5G Smartphone', img:'61gQd7MKREL', rating:4.2 },
  { asin:'B0FJFT4VDY', name:'Redmi 15 5G Midnight Black 6GB+128GB, 7000mAh Battery, Large Display 5G Smartphone', img:'81dblfYZOYL', rating:4.1 },
  { asin:'B0GGRTW1TC', name:'Poco C85 5G Mystic Purple 6GB RAM 128GB ROM Budget Smartphone', img:'41Z+58ckS0L', rating:3.8 },
  { asin:'B0G2B1S4YL', name:'Redmi 15C 5G Dusk Purple 4GB+128GB, Royale Design, 6000mAh Battery Smartphone', img:'719GNPKA8OL', rating:3.9 },
  { asin:'B0G49YZTTW', name:'realme NARZO 90 5G Carbon Black 8GB+128GB, 7000mAh Battery, 60W Charging Smartphone', img:'81c-THT67CL', rating:4.2 },
  { asin:'B0DPS62DYH', name:'OnePlus 13R 12GB+256GB Nebula Noir, AI Features, Premium 5G Smartphone', img:'614obdQ0iYL', rating:4.4 },
  { asin:'B0GTTX8WG4', name:'vivo T5X 5G Cyber Green 8GB+128GB, 7200mAh Battery, 50MP Dual Camera', img:'71uPWQoOysL', rating:4.0 },
  { asin:'B0GXZ1VC4J', name:'iQOO Neo 10 Alpine White 8GB+256GB, Snapdragon Fastest Processor, 5G Smartphone', img:'610fFRcR-+L', rating:4.4 },
  { asin:'B0GTRXVQ8N', name:'realme narzo 100 Lite 5G Frost Silver 4GB+64GB, 7000mAh Titan Battery Smartphone', img:'81vHnwGKVSL', rating:4.4 },
  { asin:'B0FZSWZZW2', name:'OnePlus 15R 12GB+256GB Charcoal Black, Snapdragon 8 Gen 5, 7400mAh 5G Smartphone', img:'61AsNTuJ6mL', rating:4.5 },
  { asin:'B0F1D9Q5G4', name:'realme NARZO 80 Pro 5G Racing Green 8GB+256GB, Dimensity 7400 Charging Smartphone', img:'71ViEOlMd6L', rating:4.3 },
  { asin:'B0FT7T3GZF', name:'Samsung Galaxy F07 Green 64GB 4GB RAM, Affordable Budget Smartphone', img:'317CVL0zICL', rating:3.7 },
  { asin:'B0F1ZGG7YJ', name:'Samsung Galaxy F06 5G Lit Violet 128GB 4GB RAM, 5G Budget Smartphone', img:'51Pff18nc0L', rating:3.9 },
  { asin:'B0G3TFPN94', name:'Motorola G57 Power 5G Fluidity 8GB+128GB, Snapdragon 6s Gen 4, 5G Smartphone', img:'51A42gljwLL', rating:4.2 },
  { asin:'B0GL1JFK48', name:'Lava Bold N2 Siachen White 4GB+64GB, 13MP AI Dual Camera Budget Smartphone', img:'51RK1P+gg6L', rating:3.6 },
  { asin:'B0C5RK3X6F', name:'Nokia 105 Single SIM Keypad Phone with Built-in UPI Payments, Long-Lasting Battery', img:'61FX8qveBNL', rating:4.0 },
  { asin:'B0CJMGTMHS', name:'Nokia 105 Classic Single SIM Keypad Phone with UPI Payments, Durable Battery', img:'51GSe9rxsoL', rating:3.9 },
  { asin:'B0CBKKBGWZ', name:'Nokia 130 Music Feature Phone with Powerful Speaker, Built-in UPI Payments', img:'616nGg8LpsL', rating:4.0 },
  { asin:'B0G81XDLGS', name:'Samsung Galaxy M17 5G Sapphire Black 4GB+128GB, 50MP Triple Camera MediaTek', img:'7101h6htEgL', rating:3.2 },
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
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, 9, '[]', '[]', NOW(), NOW(), NOW())`,
      [p.name, slug, `${p.name}. Popular smartphone on Amazon India.`, image, link, p.asin, p.rating]
    );
    inserted++;
  }

  const [cnt] = await conn.execute('SELECT COUNT(*) as c FROM product WHERE category_id = 9');
  console.log(`Done. Inserted: ${inserted}, Skipped: ${skipped}, Total in Smartphones: ${cnt[0].c}`);
  await conn.end();
})();
