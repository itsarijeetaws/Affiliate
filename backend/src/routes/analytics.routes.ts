import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAdminAuth } from "../middleware/auth.js";

export const analyticsRouter = Router();

analyticsRouter.get("/clicks", requireAdminAuth, async (_req, res) => {
  const data = await prisma.clickTracking.groupBy({
    by: ["productId"],
    _count: { productId: true },
    orderBy: { _count: { productId: "desc" } }
  });

  res.json(data);
});

analyticsRouter.get("/automation-logs", requireAdminAuth, async (_req, res) => {
  const logs = await prisma.automationLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100
  });

  res.json(logs);
});
