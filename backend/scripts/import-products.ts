/**
 * Bulk product importer with Claude-generated content.
 *
 * 1. Fill in backend/data/products-to-import.json (see template below)
 * 2. Get ASINs + image URLs from Amazon SiteStripe bar
 * 3. Run: cd backend && npx tsx scripts/import-products.ts
 *
 * Claude Haiku generates: description, pros, cons for each product.
 * Skips products whose ASIN already exists in DB.
 */

import Anthropic from "@anthropic-ai/sdk";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const DB_URL   = process.env.DATABASE_URL!;
const AI_KEY   = process.env.ANTHROPIC_API_KEY!;
const TAG      = process.env.AMAZON_PARTNER_TAG ?? "adfirststore-21";
const DATA_FILE = path.resolve(__dirname, "../data/products-to-import.json");

if (!DB_URL)  { console.error("DATABASE_URL not set"); process.exit(1); }
if (!AI_KEY)  { console.error("ANTHROPIC_API_KEY not set"); process.exit(1); }
if (!fs.existsSync(DATA_FILE)) {
  console.error(`Data file not found: ${DATA_FILE}`);
  console.error("Create it from: backend/data/products-to-import.example.json");
  process.exit(1);
}

const ai = new Anthropic({ apiKey: AI_KEY });

function parseDbUrl(url: string) {
  const u = new URL(url);
  const socketPath = u.searchParams.get("socketPath");
  return {
    user: u.username,
    password: decodeURIComponent(u.password),
    database: u.pathname.slice(1),
    ...(socketPath ? { socketPath } : { host: u.hostname, port: Number(u.port) || 3306 }),
  };
}

function toSlug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

type ImportProduct = {
  name: string;
  asin: string;
  price: number;
  rating: number;
  imageUrl: string;
  affiliateUrl?: string; // optional override; auto-generated if omitted
};

type ImportCategory = {
  categorySlug: string;
  products: ImportProduct[];
};

async function generateContent(
  productName: string,
  price: number,
  rating: number,
  categoryName: string
): Promise<{ description: string; pros: string[]; cons: string[] }> {
  const msg = await ai.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 600,
    system:
      "You write concise product review content for an Amazon India affiliate site. " +
      "Output ONLY valid JSON. No markdown, no explanation.",
    messages: [{
      role: "user",
      content:
        `Generate a product review for: "${productName}"\n` +
        `Price: ₹${price.toLocaleString("en-IN")} | Rating: ${rating}/5 | Category: ${categoryName}\n\n` +
        `Return this exact JSON structure:\n` +
        `{\n` +
        `  "description": "2-3 sentence product description for Indian buyers, mention key features and value",\n` +
        `  "pros": ["pro1", "pro2", "pro3", "pro4"],\n` +
        `  "cons": ["con1", "con2"]\n` +
        `}`,
    }],
  });

  const text = msg.content[0].type === "text" ? msg.content[0].text.trim() : "{}";
  const clean = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try {
    return JSON.parse(clean) as { description: string; pros: string[]; cons: string[] };
  } catch {
    return {
      description: `${productName} is a highly-rated ${categoryName} product available on Amazon India. Excellent value for money with ${rating}/5 rating.`,
      pros: ["Great value for money", "High customer rating", "Available on Amazon India", "Fast delivery"],
      cons: ["Limited color options", "Check latest pricing on Amazon"],
    };
  }
}

async function main() {
  const importData = JSON.parse(fs.readFileSync(DATA_FILE, "utf8")) as ImportCategory[];
  console.log(`\nLoaded ${importData.length} categories from import file.\n`);

  const pool = mysql.createPool({
    ...parseDbUrl(DB_URL),
    waitForConnections: true,
    connectionLimit: 2,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
  });

  let ok = 0, skipped = 0, failed = 0;

  for (const catImport of importData) {
    // Get category ID
    const [catRows] = await pool.query<mysql.RowDataPacket[]>(
      "SELECT id, name FROM category WHERE slug = ? LIMIT 1",
      [catImport.categorySlug]
    );

    if (!catRows.length) {
      console.log(`⚠  Category not found: ${catImport.categorySlug} — skip`);
      continue;
    }

    const categoryId = catRows[0].id as number;
    const categoryName = catRows[0].name as string;
    console.log(`\n── ${categoryName} (${catImport.products.length} products) ──`);

    for (const p of catImport.products) {
      const label = `${p.name.slice(0, 50)}`;

      // Skip if ASIN already exists
      const [existing] = await pool.query<mysql.RowDataPacket[]>(
        "SELECT id FROM product WHERE amazon_asin = ? LIMIT 1",
        [p.asin]
      );
      if ((existing as mysql.RowDataPacket[]).length > 0) {
        console.log(`  ↷  ${label} — already exists`);
        skipped++;
        continue;
      }

      process.stdout.write(`  ⏳ ${label} ... `);

      try {
        const content = await generateContent(p.name, p.price, p.rating, categoryName);
        const slug = toSlug(p.name);
        const affiliateUrl = p.affiliateUrl ?? `https://www.amazon.in/dp/${p.asin}/?tag=${TAG}`;
        const now = new Date();

        await pool.execute(
          `INSERT INTO product
           (name, slug, amazon_asin, price, rating, image_url, category_id,
            description, pros, cons, affiliate_url, last_updated, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            p.name,
            slug,
            p.asin,
            p.price,
            p.rating,
            p.imageUrl,
            categoryId,
            content.description,
            JSON.stringify(content.pros),
            JSON.stringify(content.cons),
            affiliateUrl,
            now, now, now,
          ]
        );

        ok++;
        console.log("✓");
      } catch (err) {
        failed++;
        console.log(`✗  ${String(err).slice(0, 80)}`);
      }

      await new Promise(r => setTimeout(r, 800));
    }
  }

  console.log(`\n✅  Done — imported: ${ok}  skipped: ${skipped}  failed: ${failed}\n`);
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
