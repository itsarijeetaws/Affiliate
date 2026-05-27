/**
 * Generate buying-guide blog posts: "Best [Category] Under ₹X in India 2025"
 * Each guide pulls real products from DB, writes 700-900 word HTML via Claude Haiku,
 * and publishes directly to the blogpost table.
 *
 * Run on server:
 *   cd /var/www/c56950f1-6bf0-4fc0-8b86-f5b566e1f3d2/Affiliate/backend
 *   npx tsx scripts/generate-buying-guides.ts
 *
 * Skips guides that already exist. Safe to re-run.
 * Estimated: ~40 guides × 3s = ~2 min total.
 */

import Anthropic from "@anthropic-ai/sdk";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const DB_URL    = process.env.DATABASE_URL;
const AI_KEY    = process.env.ANTHROPIC_API_KEY;
const SITE_URL  = process.env.NEXT_PUBLIC_SITE_URL || "https://bestbuysindia.com";

if (!DB_URL)  { console.error("DATABASE_URL not set");    process.exit(1); }
if (!AI_KEY)  { console.error("ANTHROPIC_API_KEY not set"); process.exit(1); }

const ai = new Anthropic({ apiKey: AI_KEY });

// ─── Price brackets per category ──────────────────────────────────────────────
// Format: { max: INR price, label: display string }
interface Bracket { max: number; label: string }
interface CatConfig { slug: string; name: string; brackets: Bracket[] }

const CATEGORY_CONFIGS: CatConfig[] = [
  // High-commission fashion first
  { slug: "womens-fashion",     name: "Women's Fashion",      brackets: [{ max: 500, label: "500" }, { max: 1000, label: "1,000" }, { max: 2000, label: "2,000" }] },
  { slug: "mens-fashion",       name: "Men's Fashion",        brackets: [{ max: 500, label: "500" }, { max: 1000, label: "1,000" }, { max: 2000, label: "2,000" }] },
  { slug: "bags-luggage",       name: "Bags & Luggage",       brackets: [{ max: 1000, label: "1,000" }, { max: 3000, label: "3,000" }, { max: 5000, label: "5,000" }] },
  { slug: "grooming",           name: "Grooming & Beauty",    brackets: [{ max: 500, label: "500" }, { max: 1000, label: "1,000" }, { max: 2000, label: "2,000" }] },
  { slug: "kitchen-appliances", name: "Kitchen Appliances",   brackets: [{ max: 2000, label: "2,000" }, { max: 5000, label: "5,000" }, { max: 10000, label: "10,000" }] },
  // Electronics
  { slug: "smartphones",        name: "Smartphones",          brackets: [{ max: 10000, label: "10,000" }, { max: 20000, label: "20,000" }, { max: 30000, label: "30,000" }, { max: 50000, label: "50,000" }] },
  { slug: "laptops",            name: "Laptops",              brackets: [{ max: 30000, label: "30,000" }, { max: 50000, label: "50,000" }, { max: 70000, label: "70,000" }, { max: 100000, label: "1,00,000" }] },
  { slug: "headphones",         name: "Headphones & Earbuds", brackets: [{ max: 500, label: "500" }, { max: 1500, label: "1,500" }, { max: 3000, label: "3,000" }, { max: 5000, label: "5,000" }] },
  { slug: "smartwatches",       name: "Smartwatches",         brackets: [{ max: 3000, label: "3,000" }, { max: 5000, label: "5,000" }, { max: 15000, label: "15,000" }] },
  { slug: "fitness",            name: "Fitness & Sports",     brackets: [{ max: 1000, label: "1,000" }, { max: 3000, label: "3,000" }, { max: 8000, label: "8,000" }] },
  { slug: "gaming",             name: "Gaming",               brackets: [{ max: 1000, label: "1,000" }, { max: 3000, label: "3,000" }, { max: 8000, label: "8,000" }] },
  { slug: "cameras",            name: "Cameras",              brackets: [{ max: 15000, label: "15,000" }, { max: 30000, label: "30,000" }, { max: 50000, label: "50,000" }] },
  { slug: "smart-tvs",          name: "Smart TVs",            brackets: [{ max: 15000, label: "15,000" }, { max: 25000, label: "25,000" }, { max: 40000, label: "40,000" }] },
  { slug: "monitors",           name: "Monitors",             brackets: [{ max: 8000, label: "8,000" }, { max: 15000, label: "15,000" }, { max: 25000, label: "25,000" }] },
  { slug: "power-banks",        name: "Power Banks",          brackets: [{ max: 1000, label: "1,000" }, { max: 2000, label: "2,000" }] },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function formatPrice(n: number): string {
  return "₹" + n.toLocaleString("en-IN");
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProductRow {
  id: number;
  name: string;
  slug: string;
  price: string;
  rating: number;
  pros: string | null;
  affiliateUrl: string;
}

// ─── HTML generation via Claude ───────────────────────────────────────────────

async function generateGuideHtml(
  catName: string,
  catSlug: string,
  maxPrice: number,
  priceLabel: string,
  products: ProductRow[]
): Promise<string> {
  const priceDisp = `₹${priceLabel}`;

  const productList = products.map((p, i) => {
    let pros: string[] = [];
    try { pros = JSON.parse(p.pros ?? "[]"); } catch { pros = []; }
    return (
      `${i + 1}. ${p.name}\n` +
      `   Price: ₹${Number(p.price).toLocaleString("en-IN")} | Rating: ${p.rating}/5\n` +
      `   Pros: ${pros.slice(0, 3).join("; ") || "N/A"}\n` +
      `   Review URL: ${SITE_URL}/product/${p.slug}\n` +
      `   Amazon URL: ${p.affiliateUrl}`
    );
  }).join("\n\n");

  const msg = await ai.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 1500,
    system:
      "You write SEO-optimized buying guide blog posts in HTML for BestBuysIndia — an Amazon India affiliate site. " +
      "Write natural, helpful content for Indian buyers. " +
      "Output ONLY valid HTML — no markdown, no code fences, no explanation. " +
      "Use these HTML elements: <p>, <h2>, <h3>, <ul>, <li>, <strong>, <a>. " +
      "Include internal links to product review pages and Amazon affiliate links. " +
      "Add class=\"cta-btn\" to Amazon buy links for orange button styling.",
    messages: [{
      role: "user",
      content:
        `Write a 700-900 word buying guide: "Best ${catName} Under ${priceDisp} in India (2025)"\n\n` +
        `Products to feature (use all of them):\n${productList}\n\n` +
        `Structure:\n` +
        `1. Opening paragraph: why ${priceDisp} is a good budget for ${catName.toLowerCase()} in India\n` +
        `2. <h2>Our Top ${products.length} Picks</h2> — for each product:\n` +
        `   <h3>[rank]. [Product Name] — ₹[price]</h3>\n` +
        `   Mini review paragraph (2-3 sentences, mention key feature for Indian buyers)\n` +
        `   <ul> with 3 key pros </ul>\n` +
        `   Two links: <a href="/product/[slug]">Read full review</a> and <a href="[affiliateUrl]" rel="nofollow sponsored noopener" target="_blank" class="cta-btn">Buy on Amazon India</a>\n` +
        `3. <h2>How to Choose the Best ${catName} Under ${priceDisp}</h2> — 3-4 tips (important for Indian climate/usage)\n` +
        `4. <h2>Frequently Asked Questions</h2> — 2 FAQs with <h3>Q:</h3> and <p>A:</p>\n` +
        `5. Short conclusion paragraph with <a href="/category/${catSlug}">link to full category</a>\n\n` +
        `Important: Indian Rupee symbol ₹, mention Amazon India, keep advice practical for Indian buyers.`,
    }],
  });

  const text = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
  // Strip any accidental markdown code fences
  return text.replace(/^```(?:html)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const pool = mysql.createPool({
    ...parseDbUrl(DB_URL!),
    waitForConnections: true,
    connectionLimit: 2,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
  });

  let ok = 0, skipped = 0, fail = 0, total = 0;

  for (const cat of CATEGORY_CONFIGS) {
    // Get category id
    const [catRows] = await pool.query<mysql.RowDataPacket[]>(
      "SELECT id FROM category WHERE slug = ? LIMIT 1",
      [cat.slug]
    );
    if (!catRows.length) {
      console.log(`  ⚠  Category not found: ${cat.slug}`);
      continue;
    }
    const categoryId = catRows[0].id as number;

    for (const bracket of cat.brackets) {
      total++;
      const slug = toSlug(`best-${cat.slug}-under-${bracket.label.replace(/,/g, "")}-india-2025`);
      const title = `Best ${cat.name} Under ₹${bracket.label} in India (2025)`;
      const label = `[${cat.name} < ₹${bracket.label}]`;

      // Skip if already exists
      const [existing] = await pool.query<mysql.RowDataPacket[]>(
        "SELECT id FROM blogpost WHERE slug = ? LIMIT 1",
        [slug]
      );
      if ((existing as mysql.RowDataPacket[]).length > 0) {
        console.log(`  ↷  ${label} already exists — skip`);
        skipped++;
        continue;
      }

      // Fetch top products in price range
      const [prodRows] = await pool.query<mysql.RowDataPacket[]>(
        `SELECT p.id, p.name, p.slug, p.price, p.rating, p.pros, p.affiliate_url AS affiliateUrl
         FROM product p
         WHERE p.category_id = ?
           AND p.price > 0
           AND CAST(p.price AS DECIMAL(10,2)) <= ?
         ORDER BY p.rating DESC, p.price DESC
         LIMIT 5`,
        [categoryId, bracket.max]
      );

      const products = prodRows as ProductRow[];

      if (products.length < 3) {
        console.log(`  ⚠  ${label} only ${products.length} products — skip`);
        skipped++;
        continue;
      }

      process.stdout.write(`  ⏳ Generating: ${label} ... `);

      try {
        const html = await generateGuideHtml(
          cat.name, cat.slug, bracket.max, bracket.label, products
        );

        const excerpt =
          `Expert picks for the best ${cat.name.toLowerCase()} under ₹${bracket.label} in India. ` +
          `Top ${products.length} reviewed with pros, cons and live Amazon India pricing.`;

        const seoTitle  = `Best ${cat.name} Under ₹${bracket.label} in India 2025 — Top Picks | BestBuysIndia`;
        const seoDesc   = `Find the best ${cat.name.toLowerCase()} under ₹${bracket.label} in India. ` +
          `Our experts reviewed ${products.length} top-rated options from Amazon India with honest analysis and value tips.`;

        const now = new Date();
        await pool.execute(
          `INSERT INTO blogpost (title, slug, content, excerpt, seo_title, seo_description, category_id, status, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'published', ?, ?)`,
          [title, slug, html, excerpt, seoTitle, seoDesc, categoryId, now, now]
        );

        ok++;
        console.log(`✓  (${products.length} products)`);
      } catch (err) {
        fail++;
        console.log(`✗  ${String(err).slice(0, 80)}`);
      }

      // Rate limit
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  console.log(`\n✅  Done — generated: ${ok}  skipped: ${skipped}  failed: ${fail}  total: ${total}`);
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
