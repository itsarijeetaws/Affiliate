/**
 * Bulk generate description + pros + cons for all products that have empty content.
 * Uses Claude Haiku (fast + cheap).
 *
 * Run on server:
 *   cd /var/www/c56950f1-6bf0-4fc0-8b86-f5b566e1f3d2/Affiliate/backend
 *   npx tsx scripts/generate-product-content.ts
 *
 * Cost: ~$0.40-0.50 for 536 products (~30-40 min)
 */

import Anthropic from "@anthropic-ai/sdk";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const DB_URL = process.env.DATABASE_URL;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

if (!DB_URL) { console.error("DATABASE_URL not set"); process.exit(1); }
if (!ANTHROPIC_KEY) { console.error("ANTHROPIC_API_KEY not set"); process.exit(1); }

const ai = new Anthropic({ apiKey: ANTHROPIC_KEY });

// Parse DATABASE_URL (supports ?socketPath=)
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

interface ProductRow {
  id: number;
  name: string;
  price: number;
  rating: number;
  categoryName: string;
}

interface GeneratedContent {
  description: string;
  pros: string[];
  cons: string[];
}

async function generate(row: ProductRow): Promise<GeneratedContent> {
  const msg = await ai.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 512,
    system:
      "You write concise product content for an Indian Amazon affiliate site (BestBuysIndia). " +
      "Respond ONLY with minified JSON — no markdown, no explanation.",
    messages: [
      {
        role: "user",
        content:
          `Product: ${row.name}\n` +
          `Category: ${row.categoryName || "Electronics"}\n` +
          `Price: ₹${row.price || 0}\n` +
          `Rating: ${row.rating || 4}/5\n\n` +
          `Generate JSON with keys: description (2-3 sentences for Indian buyers), ` +
          `pros (array of 3-5 short strings ≤10 words each), ` +
          `cons (array of 2-3 short strings ≤10 words each). ` +
          `Focus on value, performance, and relevance for Indian market.`,
      },
    ],
  });

  const text = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
  // Extract JSON object robustly — find first { and last }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error(`No JSON object found: ${text.slice(0, 120)}`);
  const clean = text.slice(start, end + 1);
  const parsed = JSON.parse(clean) as GeneratedContent;

  // Validate shape
  if (!parsed.description || !Array.isArray(parsed.pros) || !Array.isArray(parsed.cons)) {
    throw new Error(`Bad shape: ${clean.slice(0, 120)}`);
  }
  return parsed;
}

async function main() {
  const conn = await mysql.createConnection(parseDbUrl(DB_URL!));

  const [rows] = await conn.query<mysql.RowDataPacket[]>(
    `SELECT p.id, p.name, p.price, p.rating, COALESCE(c.name, 'Electronics') AS categoryName
     FROM product p
     LEFT JOIN category c ON p.category_id = c.id
     WHERE p.pros IS NULL OR p.pros = '' OR p.pros = '"[]"' OR p.pros = '[]'
     ORDER BY p.id`
  );

  const products = rows as ProductRow[];
  console.log(`\n▶  ${products.length} products need content generation\n`);

  let ok = 0;
  let fail = 0;

  for (let i = 0; i < products.length; i++) {
    const row = products[i];
    const label = `[${String(i + 1).padStart(3)}/${products.length}]`;
    const preview = row.name.slice(0, 55).padEnd(55);

    try {
      const c = await generate(row);

      await conn.execute(
        `UPDATE product SET description = ?, pros = ?, cons = ?, updatedAt = NOW() WHERE id = ?`,
        [c.description, JSON.stringify(c.pros), JSON.stringify(c.cons), row.id]
      );

      ok++;
      console.log(`${label} ✓  ${preview}`);
    } catch (err) {
      fail++;
      console.error(`${label} ✗  ${preview}  — ${String(err).slice(0, 80)}`);
    }

    // 1.5 s delay to stay under Anthropic rate limits
    if (i < products.length - 1) {
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  console.log(`\n✅  Done — success: ${ok}  failed: ${fail}`);
  await conn.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
