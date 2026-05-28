import { Router } from "express";
import { eq, desc, sql } from "drizzle-orm";
import { db } from "../lib/db.js";
import * as schema from "../db/schema.js";
import { requireAdminAuth } from "../middleware/auth.js";

export const analyticsRouter = Router();

analyticsRouter.get("/clicks", requireAdminAuth, async (_req, res) => {
  const data = await db.select().from(schema.clickEvents).orderBy(desc(schema.clickEvents.createdAt)).limit(100);
  res.json(data);
});

analyticsRouter.get("/automation-logs", requireAdminAuth, async (_req, res) => {
  const logs = await db.select().from(schema.automationLogs).orderBy(desc(schema.automationLogs.createdAt)).limit(100);
  res.json(logs);
});

// ─── Dashboard Analytics ──────────────────────────────────────────────────────

analyticsRouter.get("/dashboard", requireAdminAuth, async (_req, res) => {
  try {
    // Summary counts
    const [summary] = await db.select({
      allTime: sql<number>`COUNT(*)`,
      today:   sql<number>`SUM(CASE WHEN DATE(createdAt) = CURDATE() THEN 1 ELSE 0 END)`,
      week:    sql<number>`SUM(CASE WHEN createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END)`,
      month:   sql<number>`SUM(CASE WHEN createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END)`,
    }).from(schema.clickEvents);

    // Top 10 products by clicks
    const topProducts = await db.select({
      slug:         schema.clickEvents.slug,
      clicks:       sql<number>`COUNT(*)`,
      productName:  schema.products.name,
      categoryName: schema.categories.name,
    })
    .from(schema.clickEvents)
    .leftJoin(schema.products,   eq(schema.products.slug,       schema.clickEvents.slug))
    .leftJoin(schema.categories, eq(schema.categories.id,       schema.products.categoryId))
    .groupBy(schema.clickEvents.slug, schema.products.name, schema.categories.name)
    .orderBy(sql`COUNT(*) DESC`)
    .limit(10);

    // Clicks by category
    const byCategory = await db.select({
      categoryName: sql<string>`COALESCE(${schema.categories.name}, 'Unknown')`,
      clicks:       sql<number>`COUNT(*)`,
    })
    .from(schema.clickEvents)
    .leftJoin(schema.products,   eq(schema.products.slug,  schema.clickEvents.slug))
    .leftJoin(schema.categories, eq(schema.categories.id,  schema.products.categoryId))
    .groupBy(schema.categories.name)
    .orderBy(sql`COUNT(*) DESC`);

    // Daily clicks — last 30 days
    const daily = await db.select({
      date:   sql<string>`DATE(createdAt)`,
      clicks: sql<number>`COUNT(*)`,
    })
    .from(schema.clickEvents)
    .where(sql`createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)`)
    .groupBy(sql`DATE(createdAt)`)
    .orderBy(sql`DATE(createdAt) ASC`);

    res.json({
      summary: {
        allTime: Number(summary?.allTime ?? 0),
        today:   Number(summary?.today   ?? 0),
        week:    Number(summary?.week    ?? 0),
        month:   Number(summary?.month   ?? 0),
      },
      topProducts,
      byCategory,
      daily,
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// ─── Per-product click counts (for product table badge) ──────────────────────

analyticsRouter.get("/product-clicks", requireAdminAuth, async (_req, res) => {
  try {
    const rows = await db.select({
      slug:   schema.clickEvents.slug,
      clicks: sql<number>`COUNT(*)`,
    })
    .from(schema.clickEvents)
    .groupBy(schema.clickEvents.slug);

    const slugCounts: Record<string, number> = {};
    for (const r of rows) {
      slugCounts[r.slug] = Number(r.clicks);
    }
    res.json({ slugCounts });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});
