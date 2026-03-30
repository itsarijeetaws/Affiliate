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
  const comparison = await db.query.comparisons.findFirst({
    where: eq(schema.comparisons.slug, req.params.slug)
  });

  if (!comparison) {
    res.status(404).json({ message: "Comparison not found" });
    return;
  }

  // Fetch associated products
  const productIds = (comparison.productIds as number[]);
  const products = productIds.length
    ? await db.query.products.findMany()
    : [];
  const filteredProducts = products.filter((p) => productIds.includes(p.id));

  res.json({ ...comparison, products: filteredProducts });
});

comparisonsRouter.post("/", requireAdminAuth, validateBody(comparisonSchema), async (req, res) => {
  const { title, productIds } = req.body as z.infer<typeof comparisonSchema>;
  const slug = toSlug(title);

  const productList = await db.query.products.findMany();
  const items = productList
    .filter((p) => (productIds as number[]).includes(p.id))
    .map((p, i) => ({ position: i + 1, productId: p.id, name: p.name, price: Number(p.price), rating: p.rating, affiliateUrl: p.affiliateUrl }));

  await db.insert(schema.comparisons).values({
    title,
    slug,
    productIds,
    items
  });

  const created = await db.query.comparisons.findFirst({ where: eq(schema.comparisons.slug, slug) });
  res.status(201).json(created);
});
