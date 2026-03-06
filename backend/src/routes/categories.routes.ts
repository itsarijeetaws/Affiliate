import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAdminAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { toSlug } from "../utils/slug.js";

const schema = z.object({
  name: z.string().min(2),
  description: z.string().optional()
});

export const categoriesRouter = Router();

categoriesRouter.get("/", async (_req, res) => {
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
  res.json(categories);
});

categoriesRouter.post("/", requireAdminAuth, validateBody(schema), async (req, res) => {
  const category = await prisma.category.create({
    data: {
      name: req.body.name,
      slug: toSlug(req.body.name),
      description: req.body.description
    }
  });

  res.status(201).json(category);
});
