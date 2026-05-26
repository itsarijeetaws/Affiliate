import { Router } from "express";
import { sql, eq, inArray, desc, or, like } from "drizzle-orm";
import { db } from "../lib/db.js";
import * as schema from "../db/schema.js";
import { requireAdminAuth } from "../middleware/auth.js";
import { responseCache } from "../middleware/cache.js";

export const productsRouter = Router();

const parseJsonArray = (val: unknown): string[] => {
  if (Array.isArray(val)) {
    return val.filter((item): item is string => typeof item === "string");
  }

  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [val];
    } catch {
      return [val];
    }
  }

  return [];
};

productsRouter.get("/", responseCache("products", 180), async (req, res) => {
  const page = Number(req.query.page ?? 1);
  const limit = Math.min(Number(req.query.limit ?? 12), 1000);
  const offset = (page - 1) * limit;
  const query = String(req.query.q ?? "").trim().toLowerCase();
  const categorySlug = String(req.query.categorySlug ?? "").trim();

  // Resolve categorySlug → categoryId for filtering
  let filterCategoryId: number | null = null;
  let slugNotFound = false;
  if (categorySlug) {
    const [cat] = await db.select().from(schema.categories)
      .where(eq(schema.categories.slug, categorySlug)).limit(1);
    if (cat) filterCategoryId = cat.id;
    else slugNotFound = true; // slug given but no match → return empty
  }

  // Manual query to bypass Drizzle relational JSON bug on MariaDB
  let productsResult;
  if (slugNotFound) {
    // Unknown category slug — return empty rather than all products
    productsResult = [];
  } else if (filterCategoryId !== null) {
    // Category filter: return all products for that category (no pagination cap)
    productsResult = await db.select().from(schema.products)
      .where(eq(schema.products.categoryId, filterCategoryId))
      .orderBy(desc(schema.products.updatedAt))
      .limit(500);
  } else if (query) {
    // Text search — push filter to SQL so all rows are considered
    const pattern = `%${query}%`;
    productsResult = await db.select().from(schema.products)
      .where(or(
        like(schema.products.name, pattern),
        like(schema.products.description, pattern)
      ))
      .orderBy(desc(schema.products.updatedAt))
      .limit(200);
  } else {
    productsResult = await db.select().from(schema.products)
      .orderBy(desc(schema.products.updatedAt))
      .limit(limit)
      .offset(offset);
  }

  const categoryIds = [...new Set(productsResult.map(p => p.categoryId).filter(Boolean))];
  const categoriesList = categoryIds.length
    ? await db.select().from(schema.categories).where(inArray(schema.categories.id, categoryIds))
    : [];

  const productIds = productsResult.map(p => p.id);
  const featuresList = productIds.length
    ? await db.select().from(schema.productFeatures).where(inArray(schema.productFeatures.productId, productIds))
    : [];

  const items = productsResult.map(p => ({
    ...p,
    pros: parseJsonArray(p.pros),
    cons: parseJsonArray(p.cons),
    category: categoriesList.find(c => c.id === p.categoryId) ?? null,
    features: featuresList.filter(f => f.productId === p.id)
  }));

  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(schema.products);

  res.json({ items, pagination: { page, limit, total: query ? items.length : Number(count) } });
});

productsRouter.get("/:slug", responseCache("product", 300), async (req, res) => {
  const { slug } = req.params;
  const [product] = await db.select().from(schema.products).where(eq(schema.products.slug, String(slug))).limit(1);

  if (!product) {
    res.status(404).json({ message: "Product not found" });
    return;
  }

  const features = await db.select().from(schema.productFeatures).where(eq(schema.productFeatures.productId, product.id));
  const [category] = product.categoryId
    ? await db.select().from(schema.categories).where(eq(schema.categories.id, product.categoryId)).limit(1)
    : [null];

  res.json({
    ...product,
    pros: parseJsonArray(product.pros),
    cons: parseJsonArray(product.cons),
    features,
    category
  });
});

productsRouter.put("/:id", requireAdminAuth, async (req, res) => {
  const id = Number(req.params.id);
  await db.update(schema.products)
    .set({ ...(req.body as Partial<typeof schema.products.$inferInsert>), updatedAt: new Date() })
    .where(eq(schema.products.id, id));

  const [updated] = await db.select().from(schema.products).where(eq(schema.products.id, id)).limit(1);
  
  // Re-fetch category and features manually
  const features = await db.select().from(schema.productFeatures).where(eq(schema.productFeatures.productId, id));
  const [category] = updated?.categoryId
    ? await db.select().from(schema.categories).where(eq(schema.categories.id, updated.categoryId)).limit(1)
    : [null];

  res.json({ ...updated, features, category });
});

productsRouter.delete("/:id", requireAdminAuth, async (req, res) => {
  await db.delete(schema.products).where(eq(schema.products.id, Number(req.params.id)));
  res.status(204).send();
});
