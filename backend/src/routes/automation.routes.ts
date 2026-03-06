import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAutomationApiKey } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { generateStructuredReview, articleToHtml } from "../services/content.service.js";
import { runPriceUpdateJob } from "../services/price-update.service.js";
import { fetchProductByASIN } from "../services/amazon.service.js";
import { createPost, updatePost } from "../services/wordpress.service.js";

const generateSchema = z.object({
  productName: z.string(),
  category: z.string(),
  features: z.array(z.string()),
  pros: z.array(z.string()),
  cons: z.array(z.string())
});

const addProductsSchema = z.object({
  asins: z.array(z.string().min(8)).min(1).max(20),
  categoryId: z.number().int().positive(),
  defaultDescription: z.string().min(10)
});

const publishPostSchema = z.object({
  blogPostId: z.number().int().positive(),
  status: z.enum(["draft", "publish"]).default("draft")
});

export const automationRouter = Router();
automationRouter.use(requireAutomationApiKey);

async function logAutomation(event: string, status: string, payload: unknown, message?: string): Promise<void> {
  await prisma.automationLog.create({
    data: {
      event,
      status,
      payload: payload as object,
      message
    }
  });
}

automationRouter.post("/generate-article", validateBody(generateSchema), async (req, res) => {
  try {
    const article = await generateStructuredReview(req.body);
    await logAutomation("generate-article", "success", req.body);
    res.json({ article, html: articleToHtml(article) });
  } catch (error) {
    await logAutomation("generate-article", "failed", req.body, String(error));
    res.status(500).json({ message: "Failed to generate article" });
  }
});

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

automationRouter.post("/add-products", validateBody(addProductsSchema), async (req, res) => {
  try {
    const createdIds: number[] = [];

    for (const asin of req.body.asins) {
      const item = await fetchProductByASIN(asin);
      if (!item) {
        continue;
      }

      const created = await prisma.product.upsert({
        where: { amazonAsin: asin },
        create: {
          name: item.title,
          slug: item.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
          amazonAsin: item.asin,
          price: item.price,
          rating: item.rating,
          imageUrl: item.imageUrl,
          categoryId: req.body.categoryId,
          description: req.body.defaultDescription,
          pros: ["Good value"],
          cons: ["Limited stock"],
          affiliateUrl: item.affiliateUrl,
          lastUpdated: new Date()
        },
        update: {
          price: item.price,
          rating: item.rating,
          imageUrl: item.imageUrl,
          affiliateUrl: item.affiliateUrl,
          lastUpdated: new Date()
        }
      });

      createdIds.push(created.id);
    }

    await logAutomation("add-products", "success", { count: createdIds.length, ids: createdIds });
    res.json({ createdIds });
  } catch (error) {
    await logAutomation("add-products", "failed", req.body, String(error));
    res.status(500).json({ message: "Failed to add products" });
  }
});

automationRouter.post("/publish-post", validateBody(publishPostSchema), async (req, res) => {
  try {
    const blogPost = await prisma.blogPost.findUnique({ where: { id: req.body.blogPostId } });
    if (!blogPost) {
      res.status(404).json({ message: "Blog post not found" });
      return;
    }

    const payload = {
      title: blogPost.title,
      content: blogPost.content,
      status: req.body.status as "draft" | "publish"
    };

    const published = blogPost.wordpressPostId
      ? await updatePost(blogPost.wordpressPostId, payload)
      : await createPost(payload);

    await prisma.blogPost.update({
      where: { id: blogPost.id },
      data: {
        wordpressPostId: published.id,
        status: req.body.status
      }
    });

    await logAutomation("publish-post", "success", { blogPostId: blogPost.id, wpId: published.id });
    res.json(published);
  } catch (error) {
    await logAutomation("publish-post", "failed", req.body, String(error));
    res.status(500).json({ message: "Publishing failed" });
  }
});
