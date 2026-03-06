import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAdminAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { toSlug } from "../utils/slug.js";

const schema = z.object({
  title: z.string().min(4),
  description: z.string().optional(),
  productIds: z.array(z.number().int().positive()).min(2).max(10)
});

export const comparisonsRouter = Router();

comparisonsRouter.get("/:slug", async (req, res) => {
  const comparison = await prisma.comparisonTable.findUnique({
    where: { slug: req.params.slug },
    include: {
      items: {
        orderBy: { position: "asc" },
        include: { product: true }
      }
    }
  });

  if (!comparison) {
    res.status(404).json({ message: "Comparison not found" });
    return;
  }

  res.json(comparison);
});

comparisonsRouter.post("/", requireAdminAuth, validateBody(schema), async (req, res) => {
  const slug = toSlug(req.body.title);
  const created = await prisma.comparisonTable.create({
    data: {
      title: req.body.title,
      slug,
      description: req.body.description,
      items: {
        create: req.body.productIds.map((productId: number, index: number) => ({
          productId,
          position: index + 1
        }))
      }
    },
    include: {
      items: {
        include: { product: true }
      }
    }
  });

  res.status(201).json(created);
});
