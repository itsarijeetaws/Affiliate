import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAdminAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { toSlug } from "../utils/slug.js";

const schema = z.object({
  title: z.string().min(5),
  content: z.string().min(100),
  excerpt: z.string().optional(),
  categoryId: z.number().int().positive().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  status: z.enum(["draft", "publish"]).default("draft")
});

export const blogRouter = Router();

blogRouter.get("/", async (req, res) => {
  const page = Number(req.query.page ?? 1);
  const limit = Math.min(Number(req.query.limit ?? 10), 50);

  const [items, total] = await Promise.all([
    prisma.blogPost.findMany({
      where: { status: "published" },
      skip: (page - 1) * limit,
      take: limit,
      select: { id: true, title: true, slug: true, excerpt: true, createdAt: true },
      orderBy: { createdAt: "desc" }
    }),
    prisma.blogPost.count({ where: { status: "published" } })
  ]);

  res.json({ items, pagination: { page, limit, total } });
});

blogRouter.get("/:slug", async (req, res) => {
  const post = await prisma.blogPost.findUnique({
    where: { slug: req.params.slug }
  });

  if (!post || post.status !== "published") {
    res.status(404).json({ message: "Post not found" });
    return;
  }

  res.json(post);
});

blogRouter.post("/", requireAdminAuth, validateBody(schema), async (req, res) => {
  const created = await prisma.blogPost.create({
    data: {
      ...req.body,
      slug: toSlug(req.body.title)
    }
  });

  res.status(201).json(created);
});
