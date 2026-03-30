import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAutomationApiKey, requireAdminAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { runPriceUpdateJob } from "../services/price-update.service.js";
import { fetchProductByASIN, fetchBatchByASINs, buildAffiliateUrl } from "../services/amazon.service.js";
import { generateProductReview, generateRoundupPost, generateComparisonPost } from "../services/gemini.service.js";
import { toSlug } from "../utils/slug.js";

export const automationRouter = Router();
automationRouter.use(requireAutomationApiKey);

async function logAutomation(event: string, status: string, payload: unknown, message?: string): Promise<void> {
  await prisma.automationLog.create({
    data: { event, status, payload: payload as object, message }
  });
}

// ─── Manual Product Add (no PA API needed) ────────────────────────────────────

const manualProductSchema = z.object({
  asin: z.string().min(8).max(12),
  name: z.string().min(3),
  price: z.number().nonnegative(),
  rating: z.number().min(0).max(5).default(4.0),
  imageUrl: z.string().url(),
  categoryId: z.number().int().positive(),
  description: z.string().min(10),
  pros: z.array(z.string()).min(1).default(["Great value"]),
  cons: z.array(z.string()).min(1).default(["Limited availability"]),
  affiliateUrl: z.string().url().optional()
});

automationRouter.post("/manual-add-product", validateBody(manualProductSchema), async (req, res) => {
  try {
    const { asin, name, price, rating, imageUrl, categoryId, description, pros, cons, affiliateUrl } = req.body;
    const url = affiliateUrl ?? buildAffiliateUrl(asin);

    const product = await prisma.product.upsert({
      where: { amazonAsin: asin },
      create: {
        name,
        slug: toSlug(name),
        amazonAsin: asin,
        price,
        rating,
        imageUrl,
        categoryId,
        description,
        pros,
        cons,
        affiliateUrl: url,
        lastUpdated: new Date()
      },
      update: { price, rating, imageUrl, affiliateUrl: url, lastUpdated: new Date() }
    });

    await logAutomation("manual-add-product", "success", { asin, productId: product.id });
    res.json({ product });
  } catch (error) {
    await logAutomation("manual-add-product", "failed", req.body, String(error));
    res.status(500).json({ message: "Failed to add product", error: String(error) });
  }
});

// ─── PA API Batch Add ─────────────────────────────────────────────────────────

const addProductsSchema = z.object({
  asins: z.array(z.string().min(8)).min(1).max(20),
  categoryId: z.number().int().positive(),
  defaultDescription: z.string().min(10).default("Quality product available on Amazon India.")
});

automationRouter.post("/add-products", validateBody(addProductsSchema), async (req, res) => {
  try {
    const items = await fetchBatchByASINs(req.body.asins);
    const createdIds: number[] = [];

    for (const asin of req.body.asins as string[]) {
      const item = items.find((i) => i.asin === asin);
      const name = item?.title ?? `Product ${asin}`;
      const url = item?.affiliateUrl ?? buildAffiliateUrl(asin);

      const product = await prisma.product.upsert({
        where: { amazonAsin: asin },
        create: {
          name,
          slug: toSlug(name),
          amazonAsin: asin,
          price: item?.price ?? 0,
          rating: item?.rating ?? 4.0,
          imageUrl: item?.imageUrl ?? "",
          categoryId: req.body.categoryId,
          description: req.body.defaultDescription,
          pros: ["Good value", "Amazon Prime eligible"],
          cons: ["Check reviews before buying"],
          affiliateUrl: url,
          lastUpdated: new Date()
        },
        update: {
          price: item?.price ?? 0,
          rating: item?.rating ?? 4.0,
          imageUrl: item?.imageUrl ?? "",
          affiliateUrl: url,
          lastUpdated: new Date()
        }
      });

      createdIds.push(product.id);
    }

    await logAutomation("add-products", "success", { count: createdIds.length, ids: createdIds });
    res.json({ createdIds, fetched: items.length });
  } catch (error) {
    await logAutomation("add-products", "failed", req.body, String(error));
    res.status(500).json({ message: "Failed to add products", error: String(error) });
  }
});

// ─── Generate Blog Post for a product ────────────────────────────────────────

const generatePostSchema = z.object({
  productId: z.number().int().positive(),
  type: z.enum(["review", "roundup", "comparison"]).default("review"),
  budget: z.number().optional(),
  compareWithIds: z.array(z.number()).optional()
});

automationRouter.post("/generate-post", validateBody(generatePostSchema), async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.body.productId },
      include: { category: true, features: true }
    });

    if (!product) {
      res.status(404).json({ message: "Product not found" });
      return;
    }

    let generated;

    if (req.body.type === "roundup") {
      const siblings = await prisma.product.findMany({
        where: { categoryId: product.categoryId },
        take: 8,
        orderBy: { rating: "desc" }
      });
      generated = await generateRoundupPost(
        siblings.map((p) => ({
          name: p.name,
          price: Number(p.price),
          rating: p.rating,
          affiliateUrl: p.affiliateUrl,
          slug: p.slug
        })),
        product.category.name,
        req.body.budget
      );
    } else if (req.body.type === "comparison" && req.body.compareWithIds?.length) {
      const allIds = [product.id, ...req.body.compareWithIds];
      const products = await prisma.product.findMany({ where: { id: { in: allIds } } });
      generated = await generateComparisonPost(
        products.map((p) => ({
          name: p.name,
          price: Number(p.price),
          rating: p.rating,
          pros: p.pros as string[],
          cons: p.cons as string[],
          affiliateUrl: p.affiliateUrl
        }))
      );
    } else {
      generated = await generateProductReview({
        name: product.name,
        category: product.category.name,
        price: Number(product.price),
        rating: product.rating,
        features: product.features.map((f) => `${f.key}: ${f.value}`),
        pros: product.pros as string[],
        cons: product.cons as string[],
        affiliateUrl: product.affiliateUrl
      });
    }

    const blogPost = await prisma.blogPost.upsert({
      where: { slug: generated.slug },
      create: {
        title: generated.title,
        slug: generated.slug,
        content: generated.content,
        excerpt: generated.seoDescription,
        seoTitle: generated.seoTitle,
        seoDescription: generated.seoDescription,
        categoryId: product.categoryId,
        status: "published"
      },
      update: {
        title: generated.title,
        content: generated.content,
        excerpt: generated.seoDescription,
        seoTitle: generated.seoTitle,
        seoDescription: generated.seoDescription,
        status: "published"
      }
    });

    await logAutomation("generate-post", "success", { productId: product.id, blogPostId: blogPost.id });
    res.json({ blogPost });
  } catch (error) {
    await logAutomation("generate-post", "failed", req.body, String(error));
    res.status(500).json({ message: "Content generation failed", error: String(error) });
  }
});

// ─── Full Pipeline ────────────────────────────────────────────────────────────

const pipelineSchema = z.object({
  asins: z.array(z.string().min(8)).min(1).max(10),
  categoryId: z.number().int().positive(),
  generateContent: z.boolean().default(true),
  contentType: z.enum(["review", "roundup"]).default("review")
});

automationRouter.post("/run-pipeline", validateBody(pipelineSchema), async (req, res) => {
  const results: { asin: string; productId?: number; blogPostId?: number; status: string }[] = [];

  try {
    const items = await fetchBatchByASINs(req.body.asins);

    for (const asin of req.body.asins as string[]) {
      try {
        const item = items.find((i) => i.asin === asin);
        const name = item?.title ?? `Product ${asin}`;

        const product = await prisma.product.upsert({
          where: { amazonAsin: asin },
          create: {
            name,
            slug: toSlug(name),
            amazonAsin: asin,
            price: item?.price ?? 0,
            rating: item?.rating ?? 4.0,
            imageUrl: item?.imageUrl ?? "",
            categoryId: req.body.categoryId,
            description: `${name} available on Amazon India.`,
            pros: item?.features?.slice(0, 3) ?? ["Great value"],
            cons: ["Check latest reviews"],
            affiliateUrl: item?.affiliateUrl ?? buildAffiliateUrl(asin),
            lastUpdated: new Date()
          },
          update: {
            price: item?.price ?? 0,
            rating: item?.rating ?? 4.0,
            imageUrl: item?.imageUrl ?? "",
            lastUpdated: new Date()
          },
          include: { category: true, features: true }
        });

        let blogPostId: number | undefined;

        if (req.body.generateContent) {
          const generated = await generateProductReview({
            name: product.name,
            category: (product as typeof product & { category: { name: string } }).category?.name ?? "General",
            price: Number(product.price),
            rating: product.rating,
            features: [],
            pros: product.pros as string[],
            cons: product.cons as string[],
            affiliateUrl: product.affiliateUrl
          });

          const blogPost = await prisma.blogPost.upsert({
            where: { slug: generated.slug },
            create: {
              title: generated.title,
              slug: generated.slug,
              content: generated.content,
              excerpt: generated.seoDescription,
              seoTitle: generated.seoTitle,
              seoDescription: generated.seoDescription,
              categoryId: product.categoryId,
              status: "published"
            },
            update: {
              content: generated.content,
              title: generated.title,
              status: "published"
            }
          });
          blogPostId = blogPost.id;
        }

        results.push({ asin, productId: product.id, blogPostId, status: "success" });
      } catch (err) {
        results.push({ asin, status: `failed: ${String(err)}` });
      }
    }

    await logAutomation("run-pipeline", "success", { results });
    res.json({ results });
  } catch (error) {
    await logAutomation("run-pipeline", "failed", req.body, String(error));
    res.status(500).json({ message: "Pipeline failed", error: String(error) });
  }
});

// ─── Update Prices ────────────────────────────────────────────────────────────

automationRouter.post("/update-prices", async (_req, res) => {
  try {
    const result = await runPriceUpdateJob();
    await logAutomation("update-prices", "success", result);
    res.json(result);
  } catch (error) {
    await logAutomation("update-prices", "failed", {}, String(error));
    res.status(500).json({ message: "Price update failed" });
  }
});

// ─── Logs ─────────────────────────────────────────────────────────────────────

automationRouter.get("/logs", async (req, res) => {
  const page = Number(req.query.page ?? 1);
  const limit = Math.min(Number(req.query.limit ?? 20), 100);

  const [items, total] = await Promise.all([
    prisma.automationLog.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" }
    }),
    prisma.automationLog.count()
  ]);

  res.json({ items, pagination: { page, limit, total } });
});

// ─── Admin-accessible shortcuts (JWT auth) ────────────────────────────────────

export const adminAutomationRouter = Router();
adminAutomationRouter.use(requireAdminAuth);

adminAutomationRouter.post("/trigger-pipeline", validateBody(pipelineSchema), async (req, res) => {
  req.headers["x-automation-api-key"] = process.env.AUTOMATION_API_KEY ?? "";
  // Delegate to main automation router logic by reusing the service layer inline
  res.json({ message: "Use /automation/run-pipeline with your API key directly." });
});
