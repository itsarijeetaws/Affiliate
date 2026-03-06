import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { responseCache } from "../middleware/cache.js";
import { requireAdminAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { toSlug } from "../utils/slug.js";

const productInputSchema = z.object({
  name: z.string().min(3),
  amazonAsin: z.string().min(8),
  price: z.number().nonnegative(),
  rating: z.number().min(0).max(5),
  imageUrl: z.string().url(),
  categoryId: z.number().int().positive(),
  description: z.string().min(20),
  pros: z.array(z.string()).min(1),
  cons: z.array(z.string()).min(1),
  affiliateUrl: z.string().url()
});

export const productsRouter = Router();

productsRouter.get("/", responseCache("products", 180), async (req, res) => {
  const page = Number(req.query.page ?? 1);
  const limit = Math.min(Number(req.query.limit ?? 12), 50);

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      skip: (page - 1) * limit,
      take: limit,
      include: {
        category: true,
        features: true
      },
      orderBy: { updatedAt: "desc" }
    }),
    prisma.product.count()
  ]);

  res.json({ items, pagination: { page, limit, total } });
});

productsRouter.get("/:slug", responseCache("product", 300), async (req, res) => {
  const slug = String(req.params.slug);
  const item = await prisma.product.findUnique({
    where: { slug },
    include: { category: true, features: true }
  });

  if (!item) {
    res.status(404).json({ message: "Product not found" });
    return;
  }

  res.json(item);
});

productsRouter.post("/", requireAdminAuth, validateBody(productInputSchema), async (req, res) => {
  const data = req.body;

  const created = await prisma.product.create({
    data: {
      ...data,
      slug: toSlug(data.name),
      lastUpdated: new Date()
    }
  });

  res.status(201).json(created);
});

productsRouter.put("/:id", requireAdminAuth, validateBody(productInputSchema.partial()), async (req, res) => {
  const id = Number(req.params.id);

  const updated = await prisma.product.update({
    where: { id },
    data: {
      ...req.body,
      lastUpdated: new Date()
    }
  });

  res.json(updated);
});
