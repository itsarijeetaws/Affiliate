import { Router } from "express";
import { sql, eq, inArray, desc, asc, or, like, getTableColumns, and } from "drizzle-orm";
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

productsRouter.get("/", async (req, res, next) => {
  // Skip cache for random sort — each request needs a fresh shuffle
  if (req.query.sort === "random") return next();
  return responseCache("products", 180)(req, res, next);
}, async (req, res) => {
  const page = Number(req.query.page ?? 1);
  const limit = Math.min(Number(req.query.limit ?? 12), 2000);
  const offset = (page - 1) * limit;
  const query = String(req.query.q ?? "").trim().toLowerCase();
  const categorySlug = String(req.query.categorySlug ?? "").trim();
  const sortParam = String(req.query.sort ?? "");
  const sortRandom = sortParam === "random";

  // Reusable sort columns for non-random, non-category queries
  const sortOrder =
    sortParam === "price-asc"  ? [asc(sql`CAST(${schema.products.price} AS DECIMAL(10,2))`)] :
    sortParam === "price-desc" ? [desc(sql`CAST(${schema.products.price} AS DECIMAL(10,2))`)] :
    sortParam === "rating"     ? [desc(schema.products.rating)] :
    [desc(schema.categories.commissionRate), desc(schema.products.rating)];

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
  type ProductRow = typeof schema.products.$inferSelect;
  let productsResult: ProductRow[] = [];
  if (slugNotFound) {
    // Unknown category slug — return empty rather than all products
    productsResult = [];
  } else if (filterCategoryId !== null && query) {
    // Combined: category filter + text search
    const pattern = `%${query}%`;
    productsResult = await db.select(getTableColumns(schema.products))
      .from(schema.products)
      .leftJoin(schema.categories, eq(schema.products.categoryId, schema.categories.id))
      .where(and(
        eq(schema.products.categoryId, filterCategoryId),
        sql`CAST(${schema.products.price} AS DECIMAL(10,2)) > 0`,
        or(
          like(schema.products.name, pattern),
          like(schema.products.description, pattern)
        )
      ))
      .orderBy(...sortOrder)
      .limit(limit)
      .offset(offset);
  } else if (filterCategoryId !== null) {
    // Category filter only — paginated for normal sort, flat fetch for random
    const catWhere = and(
      eq(schema.products.categoryId, filterCategoryId),
      sql`CAST(${schema.products.price} AS DECIMAL(10,2)) > 0`
    );
    productsResult = await db.select().from(schema.products)
      .where(catWhere)
      .orderBy(sortRandom ? sql`RAND()` : desc(schema.products.rating), sortRandom ? sql`RAND()` : desc(schema.products.updatedAt))
      .limit(limit)
      .offset(sortRandom ? 0 : offset);
  } else if (query) {
    // Text search — paginated, sortable
    const pattern = `%${query}%`;
    const searchWhere = and(
      sql`CAST(${schema.products.price} AS DECIMAL(10,2)) > 0`,
      or(
        like(schema.products.name, pattern),
        like(schema.products.description, pattern)
      )
    );
    productsResult = await db.select(getTableColumns(schema.products))
      .from(schema.products)
      .leftJoin(schema.categories, eq(schema.products.categoryId, schema.categories.id))
      .where(searchWhere)
      .orderBy(...sortOrder)
      .limit(limit)
      .offset(offset);
  } else {
    // Default (all products) — paginated, sortable
    productsResult = await db.select(getTableColumns(schema.products))
      .from(schema.products)
      .leftJoin(schema.categories, eq(schema.products.categoryId, schema.categories.id))
      .where(sql`CAST(${schema.products.price} AS DECIMAL(10,2)) > 0`)
      .orderBy(...sortOrder)
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

  // Count: scoped to current filter
  let totalCount: number;
  if (filterCategoryId !== null && query) {
    const pattern = `%${query}%`;
    const [{ comboCount }] = await db.select({ comboCount: sql<number>`count(*)` })
      .from(schema.products)
      .where(and(
        eq(schema.products.categoryId, filterCategoryId),
        sql`CAST(${schema.products.price} AS DECIMAL(10,2)) > 0`,
        or(like(schema.products.name, pattern), like(schema.products.description, pattern))
      ));
    totalCount = Number(comboCount);
  } else if (filterCategoryId !== null) {
    const [{ catCount }] = await db.select({ catCount: sql<number>`count(*)` })
      .from(schema.products)
      .where(and(
        eq(schema.products.categoryId, filterCategoryId),
        sql`CAST(${schema.products.price} AS DECIMAL(10,2)) > 0`
      ));
    totalCount = Number(catCount);
  } else if (query) {
    const pattern = `%${query}%`;
    const [{ searchCount }] = await db.select({ searchCount: sql<number>`count(*)` })
      .from(schema.products)
      .where(and(
        sql`CAST(${schema.products.price} AS DECIMAL(10,2)) > 0`,
        or(
          like(schema.products.name, pattern),
          like(schema.products.description, pattern)
        )
      ));
    totalCount = Number(searchCount);
  } else {
    const [{ allCount }] = await db.select({ allCount: sql<number>`count(*)` })
      .from(schema.products)
      .where(sql`CAST(${schema.products.price} AS DECIMAL(10,2)) > 0`);
    totalCount = Number(allCount);
  }

  res.json({ items, pagination: { page, limit, total: totalCount } });
});

// ─── CSV Export (admin only) ──────────────────────────────────────────────────
// GET /api/products/export?category=slug   — must be before /:slug route
productsRouter.get("/export", requireAdminAuth, async (req, res) => {
  const categorySlug = String(req.query.category ?? "").trim();

  let rows: Array<{
    id: number; name: string; amazonAsin: string; price: string;
    mrp: string | null; rating: number; imageUrl: string;
    affiliateUrl: string; categorySlug: string | null;
  }>;

  if (categorySlug) {
    const [cat] = await db.select().from(schema.categories)
      .where(eq(schema.categories.slug, categorySlug)).limit(1);
    if (!cat) { res.status(404).json({ message: "Category not found" }); return; }

    rows = await db.select({
      id:           schema.products.id,
      name:         schema.products.name,
      amazonAsin:   schema.products.amazonAsin,
      price:        schema.products.price,
      mrp:          schema.products.mrp,
      rating:       schema.products.rating,
      imageUrl:     schema.products.imageUrl,
      affiliateUrl: schema.products.affiliateUrl,
      categorySlug: schema.categories.slug,
    })
    .from(schema.products)
    .innerJoin(schema.categories, eq(schema.products.categoryId, schema.categories.id))
    .where(eq(schema.categories.slug, categorySlug))
    .orderBy(asc(schema.products.id));
  } else {
    rows = await db.select({
      id:           schema.products.id,
      name:         schema.products.name,
      amazonAsin:   schema.products.amazonAsin,
      price:        schema.products.price,
      mrp:          schema.products.mrp,
      rating:       schema.products.rating,
      imageUrl:     schema.products.imageUrl,
      affiliateUrl: schema.products.affiliateUrl,
      categorySlug: schema.categories.slug,
    })
    .from(schema.products)
    .innerJoin(schema.categories, eq(schema.products.categoryId, schema.categories.id))
    .orderBy(asc(schema.products.id));
  }

  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const header = "id,name,amazon_asin,price,mrp,rating,category,image_url,affiliate_url";
  const lines = rows.map(r => [
    r.id,
    esc(r.name),
    esc(r.amazonAsin),
    r.price ?? "0",
    r.mrp ?? "0",
    r.rating ?? "0",
    esc(r.categorySlug),
    esc(r.imageUrl),
    esc(r.affiliateUrl),
  ].join(","));

  const csv = [header, ...lines].join("\n");
  const filename = `products-${categorySlug || "all"}-${new Date().toISOString().slice(0, 10)}.csv`;

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(csv);
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
  try {
    await db.update(schema.products)
      .set({ ...(req.body as Partial<typeof schema.products.$inferInsert>), updatedAt: new Date() })
      .where(eq(schema.products.id, id));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    // Unique constraint on amazon_asin
    if (msg.includes("amazon_asin") || msg.includes("Duplicate entry")) {
      res.status(409).json({ message: "That ASIN is already assigned to another product." });
      return;
    }
    throw err;
  }

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
