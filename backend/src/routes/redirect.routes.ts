import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../lib/db.js";
import * as schema from "../db/schema.js";
import { requireAdminAuth } from "../middleware/auth.js";

export const redirectRouter = Router();

redirectRouter.get("/go/:product_slug", async (req, res) => {
  const { product_slug } = req.params;
  const [product] = await db.select().from(schema.products).where(eq(schema.products.slug, String(product_slug))).limit(1);

  if (!product) {
    res.status(404).json({ message: "Product not found" });
    return;
  }

  try {
    await db.insert(schema.clickEvents).values({
      slug: product.slug,
      ip: req.ip ?? null,
      userAgent: req.get("user-agent") ?? null
    });
  } catch (error) {
    console.warn("Click tracking insert failed, continuing redirect", error);
  }

  res.redirect(302, product.affiliateUrl);
});
