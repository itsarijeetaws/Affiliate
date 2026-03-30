import { Router } from "express";
import { sql, eq } from "drizzle-orm";
import { db } from "../lib/db.js";
import * as schema from "../db/schema.js";
import { requireAdminAuth } from "../middleware/auth.js";
import { responseCache } from "../middleware/cache.js";

export const productsRouter = Router();

productsRouter.get("/", responseCache("products", 180), async (req, res) => {
  const page = Number(req.query.page ?? 1);
  const limit = Math.min(Number(req.query.limit ?? 12), 50);
  const offset = (page - 1) * limit;

  const items = await db.query.products.findMany({
    with: { category: true, features: true },
    orderBy: (_, { desc }) => [desc(schema.products.updatedAt)],
    limit,
    offset
  });

  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(schema.products);

  res.json({ items, pagination: { page, limit, total: Number(count) } });
});

productsRouter.get("/:slug", responseCache("product", 300), async (req, res) => {
  const { slug } = req.params;
  const [product] = await db.select().from(schema.products).where(sql`\`slug\` = ${slug}`).limit(1);

  if (!product) {
    res.status(404).json({ message: "Product not found" });
    return;
  }

  const features = await db.select().from(schema.productFeatures).where(eq(schema.productFeatures.productId, product.id));
  const [category] = product.categoryId
    ? await db.select().from(schema.categories).where(eq(schema.categories.id, product.categoryId)).limit(1)
    : [null];

  res.json({ ...product, features, category });
});

productsRouter.put("/:id", requireAdminAuth, async (req, res) => {
  const id = Number(req.params.id);
  await db.update(schema.products)
    .set({ ...(req.body as Partial<typeof schema.products.$inferInsert>), updatedAt: new Date() })
    .where(eq(schema.products.id, id));

  const [updated] = await db.select().from(schema.products).where(eq(schema.products.id, id)).limit(1);
  res.json(updated);
});

productsRouter.delete("/:id", requireAdminAuth, async (req, res) => {
  await db.delete(schema.products).where(eq(schema.products.id, Number(req.params.id)));
  res.status(204).send();
});
