import { Router } from "express";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
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
  const limit = Math.min(Number(req.query.limit ?? 10), 50);
  const offset = (page - 1) * limit;

  const items = await db.select({
    id: schema.blogPosts.id, title: schema.blogPosts.title, slug: schema.blogPosts.slug,
    excerpt: schema.blogPosts.excerpt, createdAt: schema.blogPosts.createdAt
  })
    .from(schema.blogPosts)
    .where(eq(schema.blogPosts.status, "published"))
    .orderBy(sql`createdAt DESC`)
    .limit(limit)
    .offset(offset);

  const [{ count }] = await db.select({ count: sql<number>`count(*)` })
    .from(schema.blogPosts)
    .where(eq(schema.blogPosts.status, "published"));

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

blogRouter.post("/", requireAdminAuth, validateBody(postSchema), async (req, res) => {
  const body = req.body as z.infer<typeof postSchema>;
  const slug = toSlug(body.title);

  await db.insert(schema.blogPosts).values({ title: body.title, slug, content: body.content, excerpt: body.excerpt, categoryId: body.categoryId, seoTitle: body.seoTitle, seoDescription: body.seoDescription, status: body.status });

  const [created] = await db.select().from(schema.blogPosts).where(eq(schema.blogPosts.slug, slug)).limit(1);
  res.status(201).json(created);
});
