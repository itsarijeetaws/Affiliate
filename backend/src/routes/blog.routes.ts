import { Router } from "express";
import { z } from "zod";
import { eq, sql, and } from "drizzle-orm";
import { db } from "../lib/db.js";
import * as schema from "../db/schema.js";
import { requireAdminAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { toSlug } from "../utils/slug.js";

const postSchema = z.object({
  title: z.string().min(5),
  content: z.string().min(100),
  excerpt: z.string().optional(),
  categoryId: z.number().int().positive().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  status: z.enum(["draft", "published"]).default("draft")
});

export const blogRouter = Router();

blogRouter.get("/", async (req, res) => {
  const page = Number(req.query.page ?? 1);
  const limit = Math.min(Number(req.query.limit ?? 10), 1000);
  const offset = (page - 1) * limit;

  const categoryId = req.query.categoryId ? Number(req.query.categoryId) : null;
  const whereClause = categoryId
    ? and(eq(schema.blogPosts.status, "published"), eq(schema.blogPosts.categoryId, categoryId))
    : eq(schema.blogPosts.status, "published");

  const items = await db.select({
    id: schema.blogPosts.id, title: schema.blogPosts.title, slug: schema.blogPosts.slug,
    excerpt: schema.blogPosts.excerpt, createdAt: schema.blogPosts.createdAt
  })
    .from(schema.blogPosts)
    .where(whereClause)
    .orderBy(sql`createdAt DESC`)
    .limit(limit)
    .offset(offset);

  const [{ count }] = await db.select({ count: sql<number>`count(*)` })
    .from(schema.blogPosts)
    .where(whereClause);

  res.json({ items, pagination: { page, limit, total: Number(count) } });
});

blogRouter.get("/:slug", async (req, res) => {
  const [post] = await db.select().from(schema.blogPosts)
    .where(eq(schema.blogPosts.slug, req.params.slug))
    .limit(1);

  if (!post || post.status !== "published") {
    res.status(404).json({ message: "Post not found" });
    return;
  }

  res.json(post);
});

// Admin-only: list ALL posts (any status), larger limit
blogRouter.get("/admin/list", requireAdminAuth, async (req, res) => {
  const page = Number(req.query.page ?? 1);
  const limit = Math.min(Number(req.query.limit ?? 100), 500);
  const offset = (page - 1) * limit;

  const items = await db.select({
    id: schema.blogPosts.id,
    title: schema.blogPosts.title,
    slug: schema.blogPosts.slug,
    excerpt: schema.blogPosts.excerpt,
    status: schema.blogPosts.status,
    createdAt: schema.blogPosts.createdAt,
    updatedAt: schema.blogPosts.updatedAt,
  })
    .from(schema.blogPosts)
    .orderBy(sql`createdAt DESC`)
    .limit(limit)
    .offset(offset);

  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(schema.blogPosts);

  res.json({ items, pagination: { page, limit, total: Number(count) } });
});

// Admin-only: get full post by id
blogRouter.get("/admin/:id", requireAdminAuth, async (req, res) => {
  const [post] = await db.select().from(schema.blogPosts)
    .where(eq(schema.blogPosts.id, Number(req.params.id)))
    .limit(1);
  if (!post) { res.status(404).json({ message: "Not found" }); return; }
  res.json(post);
});

blogRouter.post("/", requireAdminAuth, validateBody(postSchema), async (req, res) => {
  const body = req.body as z.infer<typeof postSchema>;
  const slug = toSlug(body.title);

  const now = new Date();
  await db.insert(schema.blogPosts).values({ title: body.title, slug, content: body.content, excerpt: body.excerpt, categoryId: body.categoryId, seoTitle: body.seoTitle, seoDescription: body.seoDescription, status: body.status, createdAt: now, updatedAt: now });

  const [created] = await db.select().from(schema.blogPosts).where(eq(schema.blogPosts.slug, slug)).limit(1);
  res.status(201).json(created);
});

// Update post
blogRouter.put("/:id", requireAdminAuth, async (req, res) => {
  const id = Number(req.params.id);
  const body = req.body as Partial<z.infer<typeof postSchema>>;
  const now = new Date();

  type BlogUpdate = {
    updatedAt: Date; title?: string; slug?: string; content?: string;
    excerpt?: string; status?: "draft" | "published"; seoTitle?: string;
    seoDescription?: string; categoryId?: number;
  };
  const updates: BlogUpdate = { updatedAt: now };
  if (body.title !== undefined) { updates.title = body.title; updates.slug = toSlug(body.title); }
  if (body.content !== undefined) updates.content = body.content;
  if (body.excerpt !== undefined) updates.excerpt = body.excerpt;
  if (body.status !== undefined) updates.status = body.status;
  if (body.seoTitle !== undefined) updates.seoTitle = body.seoTitle;
  if (body.seoDescription !== undefined) updates.seoDescription = body.seoDescription;
  if (body.categoryId !== undefined) updates.categoryId = body.categoryId;

  await db.update(schema.blogPosts).set(updates).where(eq(schema.blogPosts.id, id));

  const [updated] = await db.select().from(schema.blogPosts).where(eq(schema.blogPosts.id, id)).limit(1);
  if (!updated) { res.status(404).json({ message: "Not found" }); return; }
  res.json(updated);
});

// Toggle publish/draft
blogRouter.patch("/:id/status", requireAdminAuth, async (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body as { status: "published" | "draft" };
  if (!["published", "draft"].includes(status)) {
    res.status(400).json({ message: "status must be published or draft" }); return;
  }
  await db.update(schema.blogPosts)
    .set({ status, updatedAt: new Date() })
    .where(eq(schema.blogPosts.id, id));
  res.json({ ok: true });
});

// Delete post
blogRouter.delete("/:id", requireAdminAuth, async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(schema.blogPosts).where(eq(schema.blogPosts.id, id));
  res.json({ ok: true });
});
