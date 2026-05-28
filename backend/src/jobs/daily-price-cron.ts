import cron from "node-cron";
import { env } from "../config/env.js";
import { db } from "../lib/db.js";
import * as schema from "../db/schema.js";
import { runPriceUpdateJob } from "../services/price-update.service.js";
import { isTelegramConfigured, notifyAdmin } from "../services/telegram.service.js";

export function startDailyPriceCron(): void {
  if (!env.enableDailyCron) return;

  // 2 AM IST = price update
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

  // 10 AM IST = Telegram posts (3 guides + deal of the day)
  cron.schedule("30 4 * * *", async () => {
    if (!isTelegramConfigured()) return;
    try {
      // Dynamically import to avoid circular deps
      const { execSync } = await import("child_process");
      execSync("npx tsx scripts/telegram-post-guides.ts", {
        cwd: process.cwd(),
        stdio: "inherit",
      });
      await db.insert(schema.automationLogs).values({
        event: "telegram-post",
        status: "success",
        payload: {}
      });
    } catch (error) {
      console.error("[Cron] Telegram post failed:", String(error));
      await notifyAdmin(`Daily Telegram post failed: ${String(error)}`).catch(() => {});
      await db.insert(schema.automationLogs).values({
        event: "telegram-post",
        status: "failed",
        payload: {},
        message: String(error)
      });
    }
  });
}
