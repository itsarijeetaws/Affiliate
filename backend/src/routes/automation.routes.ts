import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { db } from "../lib/db.js";
import * as schema from "../db/schema.js";
import { requireAutomationApiKey } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { fetchBatchByASINs, buildAffiliateUrl, getAmazonIntegrationStatus } from "../services/amazon.service.js";
import { cacheClient } from "../lib/redis.js";
import {
  generateProductReview,
  generateRoundupPost,
  getAnthropicIntegrationStatus,
  getGeminiIntegrationStatus,
  getOpenaiIntegrationStatus
} from "../services/gemini.service.js";
import { runPriceUpdateJob } from "../services/price-update.service.js";
import { fetchAmazonProduct } from "../services/product-fetch.service.js";
import { toSlug } from "../utils/slug.js";
import { getWordPressIntegrationStatus } from "../services/wordpress.service.js";

const parseJsonArray = (val: unknown): string[] => {
  if (Array.isArray(val)) return val;
  if (typeof val === "string") {
    try { return JSON.parse(val); } catch { return [val]; }
  }
  return [];
};

export const automationRouter = Router();
automationRouter.use(requireAutomationApiKey);

async function logAuto(event: string, status: string, payload: unknown, message?: string) {
  try {
    const msg = message ? message.substring(0, 190) : null;
    await db.insert(schema.automationLogs).values({ event, status, payload: payload as object, message: msg });
  } catch (logErr) {
    console.error("[logAuto] Failed to write log:", String(logErr));
  }
}

// ─── Amazon PA API Debug ──────────────────────────────────────────────────────
automationRouter.get("/test-amazon", async (_req, res) => {
  try {
    const items = await fetchBatchByASINs(["B09TWCHY96"]);
    res.json({ ok: true, fetched: items.length, items });
  } catch (error) {
    res.status(500).json({ ok: false, error: String(error) });
  }
});

// ─── Fetch Product by ASIN ────────────────────────────────────────────────────
// Returns live Amazon data without saving to DB.
// Frontend preview → user confirms → POST /automation/save-fetched-product to save.

automationRouter.get("/fetch-product/:asin", async (req, res) => {
  const asin = req.params.asin.trim().toUpperCase();
  if (!/^[A-Z0-9]{10}$/.test(asin)) {
    res.status(400).json({ ok: false, error: "Invalid ASIN — must be 10 alphanumeric characters" });
    return;
  }

  try {
    const product = await fetchAmazonProduct(asin);
    if (!product) {
      res.status(404).json({ ok: false, error: "Could not fetch product — Amazon may be blocking the server IP. Try again or use the manual form." });
      return;
    }
    res.json({ ok: true, product });
  } catch (error) {
    res.status(500).json({ ok: false, error: String(error) });
  }
});

// ─── Save Fetched Product to DB ───────────────────────────────────────────────
// Call after preview confirmation. Accepts edited fields from the frontend.

automationRouter.post("/save-fetched-product", validateBody(z.object({
  asin:        z.string().min(8).max(12),
  title:       z.string().min(3).max(200),
  price:       z.number().nonnegative(),
  mrp:         z.number().nonnegative().optional(),
  rating:      z.number().min(0).max(5).default(0),
  imageUrl:    z.string().url().or(z.literal("")),
  affiliateUrl:z.string().url().optional(),
  features:    z.array(z.string()).default([]),
  categoryId:  z.number().int().positive(),
  updateId:    z.number().int().positive().optional(), // existing product ID to update
})), async (req, res) => {
  const {
    asin, title, price, mrp, rating, imageUrl,
    affiliateUrl, features, categoryId, updateId,
  } = req.body as {
    asin: string; title: string; price: number; mrp?: number; rating: number;
    imageUrl: string; affiliateUrl?: string; features: string[];
    categoryId: number; updateId?: number;
  };

  const slug        = toSlug(title).slice(0, 185);
  const affUrl      = affiliateUrl ?? buildAffiliateUrl(asin);
  const pros        = features.slice(0, 5);
  const now         = new Date();

  try {
    if (updateId) {
      // Update existing product
      await db.update(schema.products).set({
        name: title.slice(0, 185), slug, amazonAsin: asin,
        price: String(price), rating, imageUrl, categoryId,
        affiliateUrl: affUrl,
        pros: JSON.stringify(pros),
        lastUpdated: now, updatedAt: now,
      }).where(eq(schema.products.id, updateId));

      await Promise.allSettled([
        cacheClient.del(`product:/products/${slug}`),
        cacheClient.del(`products:/products`),
      ]);

      await logAuto("save-fetched-product", "success", { asin, updateId });
      const [p] = await db.select().from(schema.products).where(eq(schema.products.id, updateId)).limit(1);
      res.json({ ok: true, product: p, action: "updated" });
    } else {
      // Insert new product
      await db.insert(schema.products).values({
        name: title.slice(0, 185), slug, amazonAsin: asin,
        price: String(price), rating, imageUrl, categoryId,
        description: features.slice(0, 2).join(" ").slice(0, 500),
        pros: JSON.stringify(pros),
        cons: JSON.stringify([]),
        affiliateUrl: affUrl,
        lastUpdated: now, createdAt: now, updatedAt: now,
      }).onDuplicateKeyUpdate({
        set: { price: String(price), rating, imageUrl, affiliateUrl: affUrl, lastUpdated: now },
      });

      await cacheClient.del(`products:/products`);
      const [p] = await db.select().from(schema.products).where(eq(schema.products.amazonAsin, asin)).limit(1);
      await logAuto("save-fetched-product", "success", { asin, productId: p?.id });
      res.json({ ok: true, product: p, action: "created" });
    }
  } catch (error) {
    await logAuto("save-fetched-product", "failed", req.body, String(error));
    res.status(500).json({ ok: false, error: String(error) });
  }
});

automationRouter.get("/status", async (_req, res) => {
  const [latestLog] = await db.select().from(schema.automationLogs).orderBy(sql`createdAt DESC`).limit(1);

  res.json({
    integrations: {
      amazon: getAmazonIntegrationStatus(),
      gemini: getGeminiIntegrationStatus(),
      anthropic: getAnthropicIntegrationStatus(),
      openai: getOpenaiIntegrationStatus(),
      wordpress: getWordPressIntegrationStatus()
    },
    latestLog: latestLog ?? null
  });
});

// ─── Manual Product Add ───────────────────────────────────────────────────────

automationRouter.post("/manual-add-product", validateBody(z.object({
  asin: z.string().min(8).max(12),
  name: z.string().min(3),
  price: z.number().nonnegative(),
  rating: z.number().min(0).max(5).default(4.0),
  imageUrl: z.string().url(),
  categoryId: z.number().int().positive(),
  description: z.string().min(10),
  pros: z.array(z.string()).default(["Great value"]),
  cons: z.array(z.string()).default(["Limited availability"]),
  affiliateUrl: z.string().url().optional()
})), async (req, res) => {
  try {
    const { asin, name, price, rating, imageUrl, categoryId, description, pros, cons, affiliateUrl } = req.body as {
      asin: string; name: string; price: number; rating: number; imageUrl: string;
      categoryId: number; description: string; pros: string[]; cons: string[]; affiliateUrl?: string;
    };
    const url = affiliateUrl ?? buildAffiliateUrl(asin);
    const slug = toSlug(name);

    await db.insert(schema.products)
      .values({ name, slug, amazonAsin: asin, price: String(price), rating, imageUrl, categoryId, description, pros, cons, affiliateUrl: url, lastUpdated: new Date(), createdAt: new Date(), updatedAt: new Date() })
      .onDuplicateKeyUpdate({ set: { price: String(price), rating, imageUrl, affiliateUrl: url, lastUpdated: new Date() } });

    const [product] = await db.select().from(schema.products).where(eq(schema.products.amazonAsin, asin)).limit(1);
    await logAuto("manual-add-product", "success", { asin, productId: product?.id });
    res.json({ product });
  } catch (error) {
    await logAuto("manual-add-product", "failed", req.body, String(error));
    res.status(500).json({ message: "Failed to add product", error: String(error) });
  }
});

// ─── PA API Batch Add ─────────────────────────────────────────────────────────

automationRouter.post("/add-products", validateBody(z.object({
  asins: z.array(z.string().min(8)).min(1).max(20),
  categoryId: z.number().int().positive(),
  defaultDescription: z.string().default("Quality product available on Amazon India.")
})), async (req, res) => {
  try {
    const { asins, categoryId, defaultDescription } = req.body as { asins: string[]; categoryId: number; defaultDescription: string };
    const items = await fetchBatchByASINs(asins);
    const createdIds: number[] = [];

    for (const asin of asins) {
      const item = items.find((i) => i.asin === asin);
      const name = item?.title ?? `Product ${asin}`;
      await db.insert(schema.products)
        .values({ name, slug: toSlug(name), amazonAsin: asin, price: String(item?.price ?? 0), rating: item?.rating ?? 4.0, imageUrl: item?.imageUrl ?? "", categoryId, description: defaultDescription, pros: ["Good value"], cons: ["Check reviews"], affiliateUrl: item?.affiliateUrl ?? buildAffiliateUrl(asin), lastUpdated: new Date(), createdAt: new Date(), updatedAt: new Date() })
        .onDuplicateKeyUpdate({ set: { price: String(item?.price ?? 0), rating: item?.rating ?? 4.0, lastUpdated: new Date() } });
      const [p] = await db.select().from(schema.products).where(eq(schema.products.amazonAsin, asin)).limit(1);
      if (p) createdIds.push(p.id);
    }

    await logAuto("add-products", "success", { count: createdIds.length });
    res.json({ createdIds, fetched: items.length });
  } catch (error) {
    await logAuto("add-products", "failed", req.body, String(error));
    res.status(500).json({ message: "Amazon product import failed", error: String(error) });
  }
});

// ─── Generate Post ────────────────────────────────────────────────────────────

automationRouter.post("/generate-post", validateBody(z.object({
  productId: z.number().int().positive(),
  type: z.enum(["review", "roundup"]).default("review")
})), async (req, res) => {
  try {
    const { productId, type } = req.body as { productId: number; type: "review" | "roundup" };
    const [product] = await db.select().from(schema.products).where(eq(schema.products.id, productId)).limit(1);
    if (!product) { res.status(404).json({ message: "Product not found" }); return; }

    const features = await db.select().from(schema.productFeatures).where(eq(schema.productFeatures.productId, productId));
    const [category] = product.categoryId
      ? await db.select().from(schema.categories).where(eq(schema.categories.id, product.categoryId)).limit(1)
      : [null];

    let generated;
    if (type === "roundup") {
      const siblings = await db.select().from(schema.products).where(eq(schema.products.categoryId, product.categoryId)).limit(8);
      generated = await generateRoundupPost(
        siblings.map((p) => ({ name: p.name, price: Number(p.price), rating: p.rating, affiliateUrl: p.affiliateUrl, slug: p.slug })),
        category?.name ?? "General"
      );
    } else {
      generated = await generateProductReview({
        name: product.name, category: category?.name ?? "General", price: Number(product.price), rating: product.rating,
        features: features.map((f) => `${f.key}: ${f.value}`),
        pros: parseJsonArray(product.pros), cons: parseJsonArray(product.cons), affiliateUrl: product.affiliateUrl
      });
    }

    // Inject product images into the generated HTML at key points
    if (product.imageUrl) {
      const imgHtml = (alt: string, caption: string) =>
        `<figure class="blog-product-image">` +
        `<img src="${product.imageUrl}" alt="${alt}" referrerpolicy="no-referrer" loading="lazy">` +
        `<figcaption>${caption}</figcaption></figure>`;

      // Hero image: after the very first </h2> (end of Introduction heading)
      generated.content = generated.content.replace(
        /(<\/h2>)/,
        `$1${imgHtml(product.name, product.name)}`
      );

      // Mid-article image: before "Our Verdict" or "Final" section
      generated.content = generated.content.replace(
        /(<h2[^>]*>[^<]*(?:verdict|final|recommend|conclusion)[^<]*<\/h2>)/i,
        `${imgHtml(`${product.name} — bottom line`, "Final look")}\n$1`
      );
    }

    await db.insert(schema.blogPosts)
      .values({ title: generated.title, slug: generated.slug, content: generated.content, excerpt: generated.seoDescription, seoTitle: generated.seoTitle, seoDescription: generated.seoDescription, categoryId: product.categoryId, status: "published", createdAt: new Date(), updatedAt: new Date() })
      .onDuplicateKeyUpdate({ set: { title: generated.title, content: generated.content, status: "published" } });

    const [blogPost] = await db.select().from(schema.blogPosts).where(eq(schema.blogPosts.slug, generated.slug)).limit(1);

    // Bust product + blog API caches so next page load fetches fresh
    await Promise.allSettled([
      cacheClient.del(`product:/products/${product.slug}`),
      cacheClient.del(`products:/products`),
      cacheClient.del(`gemini:review:${product.name}`)
    ]);

    await logAuto("generate-post", "success", { productId, blogPostId: blogPost?.id });
    res.json({ blogPost });
  } catch (error) {
    await logAuto("generate-post", "failed", req.body, String(error));
    res.status(500).json({ message: "Content generation failed", error: String(error) });
  }
});

// ─── Full Pipeline ────────────────────────────────────────────────────────────

automationRouter.post("/run-pipeline", validateBody(z.object({
  asins: z.array(z.string().min(8)).min(1).max(10),
  categoryId: z.number().int().positive(),
  generateContent: z.boolean().default(true)
})), async (req, res) => {
  const { asins, categoryId, generateContent } = req.body as { asins: string[]; categoryId: number; generateContent: boolean };
  const results: Array<{ asin: string; productId?: number; blogPostId?: number; status: string }> = [];

  try {
    const items = await fetchBatchByASINs(asins);

    for (const asin of asins) {
      try {
        const item = items.find((i) => i.asin === asin);
        const name = item?.title ?? `Product ${asin}`;

        await db.insert(schema.products)
          .values({ name, slug: toSlug(name), amazonAsin: asin, price: String(item?.price ?? 0), rating: item?.rating ?? 4.0, imageUrl: item?.imageUrl ?? "", categoryId, description: `${name} — available on Amazon India.`, pros: item?.features?.slice(0, 3) ?? ["Great value"], cons: ["Check reviews"], affiliateUrl: item?.affiliateUrl ?? buildAffiliateUrl(asin), lastUpdated: new Date(), createdAt: new Date(), updatedAt: new Date() })
          .onDuplicateKeyUpdate({ set: { price: String(item?.price ?? 0), rating: item?.rating ?? 4.0, lastUpdated: new Date() } });

        const [product] = await db.select().from(schema.products).where(eq(schema.products.amazonAsin, asin)).limit(1);
        const features = product ? await db.select().from(schema.productFeatures).where(eq(schema.productFeatures.productId, product.id)) : [];
        const [category] = (product?.categoryId) ? await db.select().from(schema.categories).where(eq(schema.categories.id, product.categoryId)).limit(1) : [null];

        let blogPostId: number | undefined;
        if (generateContent && product) {
          const generated = await generateProductReview({
            name: product.name, category: category?.name ?? "General", price: Number(product.price), rating: product.rating,
            features: features.map((f) => `${f.key}: ${f.value}`),
            pros: parseJsonArray(product.pros), cons: parseJsonArray(product.cons), affiliateUrl: product.affiliateUrl
          });
          await db.insert(schema.blogPosts)
            .values({ title: generated.title, slug: generated.slug, content: generated.content, excerpt: generated.seoDescription, seoTitle: generated.seoTitle, seoDescription: generated.seoDescription, categoryId, status: "published", createdAt: new Date(), updatedAt: new Date() })
            .onDuplicateKeyUpdate({ set: { content: generated.content, status: "published" } });
          const [bp] = await db.select().from(schema.blogPosts).where(eq(schema.blogPosts.slug, generated.slug)).limit(1);
          blogPostId = bp?.id;
        }
        results.push({ asin, productId: product?.id, blogPostId, status: "success" });
      } catch (err) {
        results.push({ asin, status: `failed: ${String(err)}` });
      }
    }
    await logAuto("run-pipeline", "success", { results });
    res.json({ results });
  } catch (error) {
    await logAuto("run-pipeline", "failed", req.body, String(error));
    res.status(500).json({ message: "Pipeline failed", error: String(error) });
  }
});

// ─── Update Prices ────────────────────────────────────────────────────────────

automationRouter.post("/update-prices", async (_req, res) => {
  try {
    // Scraper-based — no Amazon PA API key required
    const result = await runPriceUpdateJob();
    await logAuto("update-prices", "success", result);
    res.json(result);
  } catch (error) {
    await logAuto("update-prices", "failed", {}, String(error));
    res.status(500).json({ message: "Price update failed", error: String(error) });
  }
});

// ─── CSV Bulk Import ──────────────────────────────────────────────────────────
// CSV columns (header row required):
// asin,name,price,rating,imageUrl,categoryId,description,affiliateUrl
//
// affiliateUrl is optional — auto-built from ASIN + partner tag if blank.

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

automationRouter.post("/bulk-import", upload.single("file"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ message: "No file uploaded. Send multipart/form-data with field 'file'." });
    return;
  }

  const csv = req.file.buffer.toString("utf-8");
  const lines = csv.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) {
    res.status(400).json({ message: "CSV must have a header row and at least one data row." });
    return;
  }

  const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/^"|"$/g, ""));

  // Load all categories once for name→id resolution
  const allCats = await db.select().from(schema.categories);
  const defaultCatId = allCats[0]?.id ?? 6;

  const resolveCatId = (row: Record<string, string>): number => {
    const numId = parseInt(row["categoryid"] || row["category_id"] || "0", 10);
    if (numId > 0) return numId;
    const catName = (row["category"] || "").toLowerCase().trim();
    if (!catName) return defaultCatId;
    // Exact match first, then partial
    const exact = allCats.find(c => c.name.toLowerCase() === catName);
    if (exact) return exact.id;
    const partial = allCats.find(c =>
      c.name.toLowerCase().includes(catName) || catName.includes(c.name.toLowerCase())
    );
    return partial?.id ?? defaultCatId;
  };

  const results: Array<{ row: number; asin: string; status: string; error?: string }> = [];

  for (let i = 1; i < lines.length; i++) {
    // Handle quoted fields with commas
    const cols: string[] = [];
    let cur = "";
    let inQ = false;
    for (const ch of lines[i]) {
      if (ch === '"') { inQ = !inQ; }
      else if (ch === "," && !inQ) { cols.push(cur.trim()); cur = ""; }
      else cur += ch;
    }
    cols.push(cur.trim());

    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = (cols[idx] ?? "").replace(/^"|"$/g, "").trim(); });

    const asin = row["asin"] || "";
    const name = row["name"] || "";

    if (!asin || !name) {
      results.push({ row: i + 1, asin, status: "skipped", error: "Missing asin or name" });
      continue;
    }

    try {
      const price     = parseFloat(row["price"] || "0") || 0;
      const rating    = Math.min(5, Math.max(0, parseFloat(row["rating"] || "0") || 0));
      const imageUrl  = row["imageurl"] || row["image_url"] || "";
      const catId     = resolveCatId(row);
      const desc      = row["description"] || "";
      const affUrl    = row["affiliateurl"] || row["affiliate_url"] || buildAffiliateUrl(asin);
      const safeName  = name.slice(0, 185);
      const slug      = toSlug(safeName).slice(0, 185);

      const now = new Date();
      await db.insert(schema.products).values({
        amazonAsin: asin, name: safeName, slug, price: String(price), rating,
        imageUrl, categoryId: catId,
        description: desc,
        affiliateUrl: affUrl,
        pros: JSON.stringify([]),
        cons: JSON.stringify([]),
        lastUpdated: now, createdAt: now, updatedAt: now,
      }).onDuplicateKeyUpdate({
        set: {
          name: safeName,
          slug,
          price: String(price),
          rating,
          imageUrl,
          categoryId: catId,
          affiliateUrl: affUrl,
          description: desc,
          lastUpdated: now,
        }
      });

      results.push({ row: i + 1, asin, status: "created" });
      await cacheClient.del(`products:/products`, `products:/products?limit=100`);
    } catch (err) {
      const errStr = String(err);
      results.push({ row: i + 1, asin, status: "failed", error: errStr.substring(0, 120) });
    }
  }

  const created = results.filter(r => r.status === "created").length;
  const failed  = results.filter(r => r.status === "failed").length;
  await logAuto("bulk-import", failed === 0 ? "success" : "partial", { total: results.length, created, failed });

  res.json({ upserted: created, failed, total: results.length, results });
});

// ─── Auto-Categorize ─────────────────────────────────────────────────────────
// POST /automation/auto-categorize
// body: { dryRun?: boolean, categorySlug?: string }
// Uses Claude Haiku to verify/fix product categories in batches of 8.

automationRouter.post("/auto-categorize", async (req, res) => {
  const dryRun: boolean = req.body?.dryRun !== false; // default true (safe)
  const categorySlugFilter: string | undefined = req.body?.categorySlug || undefined;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ ok: false, error: "ANTHROPIC_API_KEY not set" });
    return;
  }

  try {
    // Load all categories
    const allCats = await db.select().from(schema.categories);
    const slugList = allCats.map(c => c.slug).join(", ");
    const catById  = new Map(allCats.map(c => [c.id, c]));
    const catBySlug = new Map(allCats.map(c => [c.slug, c]));

    // Load products (optionally filtered by category)
    let products: { id: number; name: string; categoryId: number }[] = [];
    if (categorySlugFilter) {
      const filterCat = catBySlug.get(categorySlugFilter);
      if (!filterCat) {
        res.status(400).json({ ok: false, error: `Unknown categorySlug: ${categorySlugFilter}` });
        return;
      }
      const rows = await db
        .select({ id: schema.products.id, name: schema.products.name, categoryId: schema.products.categoryId })
        .from(schema.products)
        .where(eq(schema.products.categoryId, filterCat.id))
        .limit(300);
      products = rows;
    } else {
      const rows = await db
        .select({ id: schema.products.id, name: schema.products.name, categoryId: schema.products.categoryId })
        .from(schema.products)
        .limit(300);
      products = rows;
    }

    // Transitions that are NEVER valid — AI confuses product ecosystem with category
    // e.g. "Car Charger for phone" is mobile-accessories, not automotive
    const BLOCKED_TRANSITIONS: Record<string, string[]> = {
      "mobile-accessories": ["automotive", "gaming", "cameras", "computer-peripherals", "electronics"],
      "baby-kids":          ["electronics", "gaming", "grooming"],
      "office-products":    ["electronics", "computer-peripherals"],
      "toys":               ["gaming", "electronics"],
      "books":              ["electronics"],
      "fitness":            ["electronics", "automotive"],
    };

    // Brand-name-only products (short names with no product description) — skip
    const BRAND_ONLY_RE = /^[A-Za-z0-9\s&.,']+$/;
    function isBrandOnly(name: string): boolean {
      return name.trim().split(/\s+/).length <= 2 && BRAND_ONLY_RE.test(name.trim());
    }

    const BATCH = 8;
    const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
    type ChangeItem = { id: number; name: string; from: string; to: string; toId: number };
    const changes: ChangeItem[] = [];
    let unchanged = 0;
    let failed = 0;

    for (let i = 0; i < products.length; i += BATCH) {
      const batch = products.slice(i, i + BATCH);
      const input = JSON.stringify(batch.map(p => ({ id: p.id, name: p.name, currentSlug: catById.get(p.categoryId)?.slug ?? "unknown" })));

      const prompt =
        `You are a product categorizer for an Indian Amazon affiliate site.\n` +
        `For each product, pick the single best category slug from this exact list:\n` +
        `${slugList}\n\n` +
        `Strict rules — follow exactly:\n` +
        `- Phone chargers (including car chargers), USB cables, phone cases, screen protectors, phone stands, pop sockets, phone holders → mobile-accessories\n` +
        `- Gimbals/stabilizers designed for smartphones → mobile-accessories\n` +
        `- Gaming controllers/gamepads designed for smartphones/tablets → mobile-accessories\n` +
        `- Styluses/pens for tablets or phones → mobile-accessories\n` +
        `- Selfie sticks, ring lights for phones, phone lenses → mobile-accessories\n` +
        `- Portable/power banks → power-banks\n` +
        `- Use "automotive" ONLY for vehicle parts, car tools, seat covers, dash cams (standalone), not phone accessories used in cars\n` +
        `- Use "gaming" ONLY for PC/console hardware (mice, keyboards, headsets, controllers for PC/console)\n` +
        `- Use "cameras" ONLY for actual cameras, lenses, tripods for cameras — not phone photography accessories\n` +
        `- If product name is only a brand name (e.g. "Samsung", "OnePlus") with no product description, keep slug same as current category\n` +
        `- When uncertain, prefer keeping the current category over changing it\n\n` +
        `Products (id + name + currentSlug):\n${input}\n\n` +
        `Reply ONLY with a JSON array: [{"id":123,"slug":"the-slug"},...]\n` +
        `No explanation. No markdown. Only the JSON array.`;

      try {
        const resp = await fetch(ANTHROPIC_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-haiku-4-5",
            max_tokens: 300,
            messages: [{ role: "user", content: prompt }],
          }),
        });

        if (!resp.ok) { failed += batch.length; continue; }

        const data = await resp.json() as { content: Array<{ type: string; text?: string }> };
        const text = (data.content ?? []).filter(b => b.type === "text").map(b => b.text ?? "").join("");
        const s = text.indexOf("["), e = text.lastIndexOf("]");
        if (s === -1 || e === -1) { failed += batch.length; continue; }

        const suggestions = JSON.parse(text.slice(s, e + 1)) as Array<{ id: number; slug: string }>;

        for (const sug of suggestions) {
          const product = batch.find(p => p.id === sug.id);
          if (!product) continue;
          const sugCat = catBySlug.get(sug.slug);
          if (!sugCat) { failed++; continue; }

          // Same category — no change
          if (sugCat.id === product.categoryId) { unchanged++; continue; }

          const fromSlug = catById.get(product.categoryId)?.slug ?? "unknown";

          // Skip brand-name-only products — can't reliably categorize from name alone
          if (isBrandOnly(product.name)) { unchanged++; continue; }

          // Block known-bad transitions (AI ecosystem confusion)
          const blocked = BLOCKED_TRANSITIONS[fromSlug];
          if (blocked?.includes(sug.slug)) { unchanged++; continue; }

          changes.push({ id: product.id, name: product.name, from: fromSlug, to: sug.slug, toId: sugCat.id });
        }
      } catch {
        failed += batch.length;
      }

      // 600 ms rate-limit delay between batches
      if (i + BATCH < products.length) {
        await new Promise(r => setTimeout(r, 600));
      }
    }

    // Apply if not dry-run
    if (!dryRun && changes.length > 0) {
      for (const c of changes) {
        await db.update(schema.products)
          .set({ categoryId: c.toId, updatedAt: new Date() })
          .where(eq(schema.products.id, c.id));
      }
      await cacheClient.del("products:/products");
      await logAuto("auto-categorize", "success", { changed: changes.length, unchanged, failed, dryRun: false });
    }

    res.json({ ok: true, dryRun, total: products.length, changed: changes.length, unchanged, failed, changes });
  } catch (error) {
    await logAuto("auto-categorize", "failed", { dryRun }, String(error));
    res.status(500).json({ ok: false, error: String(error) });
  }
});

// ─── Logs ─────────────────────────────────────────────────────────────────────

automationRouter.get("/logs", async (req, res) => {
  const page = Number(req.query.page ?? 1);
  const limit = Math.min(Number(req.query.limit ?? 20), 100);
  const offset = (page - 1) * limit;

  const items = await db.select().from(schema.automationLogs).orderBy(sql`createdAt DESC`).limit(limit).offset(offset);
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(schema.automationLogs);

  res.json({ items, pagination: { page, limit, total: Number(count) } });
});
