import { Router } from "express";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { db } from "../lib/db.js";
import * as schema from "../db/schema.js";
import { requireAdminAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";

export const subscribeRouter = Router();

const subscribeSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
});

// POST /subscribe — public
subscribeRouter.post("/", validateBody(subscribeSchema), async (req, res) => {
  const { email } = req.body as z.infer<typeof subscribeSchema>;

  const [existing] = await db
    .select()
    .from(schema.emailSubscribers)
    .where(eq(schema.emailSubscribers.email, email))
    .limit(1);

  if (existing) {
    // Already subscribed — still return 200 so UI shows success (no enumeration)
    res.json({ ok: true, message: "You're already subscribed!" });
    return;
  }

  await db.insert(schema.emailSubscribers).values({ email });
  res.status(201).json({ ok: true, message: "Subscribed successfully!" });
});

// GET /subscribe — admin only, list all subscribers
subscribeRouter.get("/", requireAdminAuth, async (req, res) => {
  const page = Number(req.query.page ?? 1);
  const limit = Math.min(Number(req.query.limit ?? 500), 1000);
  const offset = (page - 1) * limit;

  const items = await db
    .select()
    .from(schema.emailSubscribers)
    .orderBy(sql`createdAt DESC`)
    .limit(limit)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.emailSubscribers);

  res.json({ items, pagination: { page, limit, total: Number(count) } });
});

// DELETE /subscribe/:id — admin only
subscribeRouter.delete("/:id", requireAdminAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ message: "Invalid id" }); return; }
  await db.delete(schema.emailSubscribers).where(eq(schema.emailSubscribers.id, id));
  res.json({ ok: true });
});
