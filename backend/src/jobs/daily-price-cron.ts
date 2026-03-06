import cron from "node-cron";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { runPriceUpdateJob } from "../services/price-update.service.js";

export function startDailyPriceCron(): void {
  if (!env.enableDailyCron) {
    return;
  }

  // Runs daily at 02:00 server time; n8n can trigger the same logic via /automation/update-prices.
  cron.schedule("0 2 * * *", async () => {
    try {
      const result = await runPriceUpdateJob();
      await prisma.automationLog.create({
        data: {
          event: "daily-price-update",
          status: "success",
          payload: result
        }
      });
    } catch (error) {
      await prisma.automationLog.create({
        data: {
          event: "daily-price-update",
          status: "failed",
          message: String(error)
        }
      });
    }
  });
}
