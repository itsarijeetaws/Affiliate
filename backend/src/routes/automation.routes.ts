import { Router } from "express";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { db } from "../lib/db.js";
import * as schema from "../db/schema.js";
import { requireAutomationApiKey } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { fetchBatchByASINs, buildAffiliateUrl } from "../services/amazon.service.js";
import { generateProductReview, generateRoundupPost } from "../services/gemini.service.js";
import { runPriceUpdateJob } from "../services/price-update.service.js";
import { toSlug } from "../utils/slug.js";

export const automationRouter = Router();
automationRouter.use(requireAutomationApiKey);

async function logAuto(event: string, status: string, payload: unknown, message?: string) {
  await db.insert(schema.automationLogs).values({ event, status, payload: payload as object, message: message ?? null });
}

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
      .values({ name, slug, amazonAsin: asin, price: String(price), rating, imageUrl, categoryId, description, pros, cons, affiliateUrl: url, lastUpdated: new Date() })
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
        .values({ name, slug: toSlug(name), amazonAsin: asin, price: String(item?.price ?? 0), rating: item?.rating ?? 4.0, imageUrl: item?.imageUrl ?? "", categoryId, description: defaultDescription, pros: ["Good value"], cons: ["Check reviews"], affiliateUrl: item?.affiliateUrl ?? buildAffiliateUrl(asin), lastUpdated: new Date() })
        .onDuplicateKeyUpdate({ set: { price: String(item?.price ?? 0), rating: item?.rating ?? 4.0, lastUpdated: new Date() } });
      const [p] = await db.select().from(schema.products).where(eq(schema.products.amazonAsin, asin)).limit(1);
      if (p) createdIds.push(p.id);
    }

    await logAuto("add-products", "success", { count: createdIds.length });
    res.json({ createdIds, fetched: items.length });
  } catch (error) {
    await logAuto("add-products", "failed", req.body, String(error));
    res.status(500).json({ message: "Failed", error: String(error) });
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
        pros: product.pros as string[], cons: product.cons as string[], affiliateUrl: product.affiliateUrl
      });
    }

    await db.insert(schema.blogPosts)
      .values({ title: generated.title, slug: generated.slug, content: generated.content, excerpt: generated.seoDescription, seoTitle: generated.seoTitle, seoDescription: generated.seoDescription, categoryId: product.categoryId, status: "published" })
      .onDuplicateKeyUpdate({ set: { title: generated.title, content: generated.content, status: "published" } });

    const [blogPost] = await db.select().from(schema.blogPosts).where(eq(schema.blogPosts.slug, generated.slug)).limit(1);
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
          .values({ name, slug: toSlug(name), amazonAsin: asin, price: String(item?.price ?? 0), rating: item?.rating ?? 4.0, imageUrl: item?.imageUrl ?? "", categoryId, description: `${name} — available on Amazon India.`, pros: item?.features?.slice(0, 3) ?? ["Great value"], cons: ["Check reviews"], affiliateUrl: item?.affiliateUrl ?? buildAffiliateUrl(asin), lastUpdated: new Date() })
          .onDuplicateKeyUpdate({ set: { price: String(item?.price ?? 0), rating: item?.rating ?? 4.0, lastUpdated: new Date() } });

        const [product] = await db.select().from(schema.products).where(eq(schema.products.amazonAsin, asin)).limit(1);
        const features = product ? await db.select().from(schema.productFeatures).where(eq(schema.productFeatures.productId, product.id)) : [];
        const [category] = (product?.categoryId) ? await db.select().from(schema.categories).where(eq(schema.categories.id, product.categoryId)).limit(1) : [null];

        let blogPostId: number | undefined;
        if (generateContent && product) {
          const generated = await generateProductReview({
            name: product.name, category: category?.name ?? "General", price: Number(product.price), rating: product.rating,
            features: features.map((f) => `${f.key}: ${f.value}`),
            pros: product.pros as string[], cons: product.cons as string[], affiliateUrl: product.affiliateUrl
          });
          await db.insert(schema.blogPosts)
            .values({ title: generated.title, slug: generated.slug, content: generated.content, excerpt: generated.seoDescription, seoTitle: generated.seoTitle, seoDescription: generated.seoDescription, categoryId, status: "published" })
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
    const result = await runPriceUpdateJob();
    await logAuto("update-prices", "success", result);
    res.json(result);
  } catch (error) {
    await logAuto("update-prices", "failed", {}, String(error));
    res.status(500).json({ message: "Price update failed" });
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
