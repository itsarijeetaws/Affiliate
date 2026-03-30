import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db } from "../lib/db.js";
import * as schema from "../db/schema.js";
import { requireAdminAuth } from "../middleware/auth.js";

export const analyticsRouter = Router();

analyticsRouter.get("/clicks", requireAdminAuth, async (_req, res) => {
  // Basic click count grouped by slug
  const data = await db.select().from(schema.clickEvents).orderBy(desc(schema.clickEvents.createdAt)).limit(100);
  res.json(data);
});

analyticsRouter.get("/automation-logs", requireAdminAuth, async (_req, res) => {
  const logs = await db.select().from(schema.automationLogs).orderBy(desc(schema.automationLogs.createdAt)).limit(100);
  res.json(logs);
});
