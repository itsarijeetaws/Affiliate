import { Router } from "express";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../lib/db.js";
import * as schema from "../db/schema.js";
import { requireAdminAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { toSlug } from "../utils/slug.js";

const comparisonSchema = z.object({
  title: z.string().min(4),
  description: z.string().optional(),
  productIds: z.array(z.number().int().positive()).min(2).max(10)
});

export const comparisonsRouter = Router();

comparisonsRouter.get("/:slug", async (req, res) => {
  const [comparison] = await db.select().from(schema.comparisons).where(eq(schema.comparisons.slug, req.params.slug)).limit(1);

  if (!comparison) {
    res.status(404).json({ message: "Comparison not found" });
    return;
  }

  // Fetch associated products
  const productIds = comparison.productIds as number[];
  const products = productIds.length > 0
    ? await db.select().from(schema.products) // Could optimize with inArray, but copying original logic
    : [];
  const filteredProducts = products.filter((p) => productIds.includes(p.id));

  res.json({ ...comparison, products: filteredProducts });
});

comparisonsRouter.post("/", requireAdminAuth, validateBody(comparisonSchema), async (req, res) => {
  const { title, productIds } = req.body as z.infer<typeof comparisonSchema>;
  const slug = toSlug(title);

  const productList = await db.select().from(schema.products);
  const items = productList
    .filter((p) => productIds.includes(p.id))
    .map((p, i) => ({ position: i + 1, productId: p.id, name: p.name, price: Number(p.price), rating: p.rating, affiliateUrl: p.affiliateUrl }));

  await db.insert(schema.comparisons).values({
    title,
    slug,
    productIds,
    items
  });

  const [created] = await db.select().from(schema.comparisons).where(eq(schema.comparisons.slug, slug)).limit(1);
  res.status(201).json(created);
});
