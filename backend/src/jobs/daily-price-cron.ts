import cron from "node-cron";
import { env } from "../config/env.js";
import { db } from "../lib/db.js";
import * as schema from "../db/schema.js";
import { runPriceUpdateJob } from "../services/price-update.service.js";

export function startDailyPriceCron(): void {
  if (!env.enableDailyCron) return;

  cron.schedule("0 2 * * *", async () => {
    try {
      const result = await runPriceUpdateJob();
      await db.insert(schema.automationLogs).values({
        event: "daily-price-update",
        status: "success",
        payload: result
      });
    } catch (error) {
      await db.insert(schema.automationLogs).values({
        event: "daily-price-update",
        status: "failed",
        payload: {},
        message: String(error)
      });
    }
  });
}
