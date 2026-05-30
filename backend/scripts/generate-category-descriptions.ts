/**
 * Generate SEO-optimized descriptions for categories that have empty descriptions.
 * Uses Claude Haiku (fast + cheap).
 *
 * Run on server:
 *   cd /var/www/c56950f1-6bf0-4fc0-8b86-f5b566e1f3d2/Affiliate/backend
 *   npx tsx scripts/generate-category-descriptions.ts
 */

import mysql from "mysql2/promise";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const DB_URL = process.env.DATABASE_URL;
const GEMINI_KEY = process.env.GEMINI_API_KEY;

if (!DB_URL)     { console.error("DATABASE_URL not set");   process.exit(1); }
if (!GEMINI_KEY) { console.error("GEMINI_API_KEY not set"); process.exit(1); }

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;

async function callGemini(system: string, user: string, maxTokens = 300): Promise<string> {
  const resp = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents: [{ parts: [{ text: user }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: maxTokens }
    })
  });
  if (!resp.ok) throw new Error(`Gemini ${resp.status}: ${await resp.text()}`);
  const data = await resp.json() as { candidates: Array<{ content: { parts: Array<{ text: string }> } }> };
  return (data.candidates[0]?.content?.parts[0]?.text ?? "").trim();
}

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

interface CategoryRow {
  id: number;
  name: string;
  slug: string;
  productCount: number;
}

async function generateDescription(cat: CategoryRow): Promise<string> {
  const text = await callGemini(
    "You write concise SEO-optimized category descriptions for an Indian Amazon affiliate site (BestBuysIndia). " +
    "2-3 sentences. Natural, informative, no fluff. No markdown. Target Indian buyers.",
    `Write a 2-3 sentence category description for: "${cat.name}"\n` +
    `Site: BestBuysIndia — Amazon India product reviews and comparisons\n` +
    `Products in category: ${cat.productCount}\n` +
    `Focus: help Indian buyers find the best ${cat.name.toLowerCase()} with expert reviews and live Amazon pricing.`
  );
  if (!text) throw new Error("Empty response");
  return text;
}

async function main() {
  const pool = mysql.createPool({
    ...parseDbUrl(DB_URL!),
    waitForConnections: true,
    connectionLimit: 2,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
  });

  const [rows] = await pool.query<mysql.RowDataPacket[]>(
    `SELECT c.id, c.name, c.slug,
            COUNT(p.id) AS productCount
     FROM category c
     LEFT JOIN product p ON p.category_id = c.id
     WHERE c.description IS NULL OR c.description = ''
     GROUP BY c.id
     ORDER BY c.name`
  );

  const categories = rows as CategoryRow[];
  console.log(`\n▶  ${categories.length} categories need descriptions\n`);

  if (categories.length === 0) {
    console.log("All categories already have descriptions.");
    await pool.end();
    return;
  }

  let ok = 0;
  let fail = 0;

  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i];
    const label = `[${String(i + 1).padStart(2)}/${categories.length}]`;
    const preview = cat.name.padEnd(25);

    try {
      const description = await generateDescription(cat);
      await pool.execute(
        `UPDATE category SET description = ? WHERE id = ?`,
        [description, cat.id]
      );
      ok++;
      console.log(`${label} ✓  ${preview}  ${description.slice(0, 60)}…`);
    } catch (err) {
      fail++;
      console.error(`${label} ✗  ${preview}  — ${String(err).slice(0, 80)}`);
    }

    // Small delay to stay under rate limits
    if (i < categories.length - 1) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  console.log(`\n✅  Done — success: ${ok}  failed: ${fail}`);
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
