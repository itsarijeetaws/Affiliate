import { Router } from "express";
import { db } from "../lib/db.js";
import * as schema from "../db/schema.js";
import { requireAdminAuth } from "../middleware/auth.js";

export const redirectRouter = Router();

redirectRouter.get("/go/:product_slug", async (req, res) => {
  const { product_slug } = req.params;
  const product = await db.query.products.findFirst({
    where: (p, { eq }) => eq(p.slug, product_slug)
  });

  if (!product) {
    res.status(404).json({ message: "Product not found" });
    return;
  }

  await db.insert(schema.clickEvents).values({
    slug: product.slug,
    ip: req.ip ?? null,
    userAgent: req.get("user-agent") ?? null
  });

  res.redirect(302, product.affiliateUrl);
});
