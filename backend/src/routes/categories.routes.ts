import { Router } from "express";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../lib/db.js";
import * as schema from "../db/schema.js";
import { requireAdminAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { toSlug } from "../utils/slug.js";

const categorySchema = z.object({
  name: z.string().min(2),
  description: z.string().optional()
});

export const categoriesRouter = Router();

categoriesRouter.get("/", async (_req, res) => {
  const categories = await db.select().from(schema.categories).orderBy(schema.categories.name);
  res.json(categories);
});

categoriesRouter.post("/", requireAdminAuth, validateBody(categorySchema), async (req, res) => {
  const body = req.body as z.infer<typeof categorySchema>;
  const slug = toSlug(body.name);

  await db.insert(schema.categories).values({ name: body.name, slug, description: body.description });
  const [created] = await db.select().from(schema.categories).where(eq(schema.categories.slug, slug)).limit(1);
  res.status(201).json(created);
});
