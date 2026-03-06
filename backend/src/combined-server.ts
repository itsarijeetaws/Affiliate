import path from "path";
import { createRequire } from "module";
import type { Request, Response } from "express";
import { app } from "./app.js";
import { env } from "./config/env.js";
import { startDailyPriceCron } from "./jobs/daily-price-cron.js";

const require = createRequire(import.meta.url);
const nextFactory = require("next") as (options: { dev: boolean; dir: string }) => {
  prepare: () => Promise<void>;
  getRequestHandler: () => (req: Request, res: Response) => void;
};

const dev = process.env.NODE_ENV !== "production";
const nextDir = path.resolve(process.cwd(), "frontend");
const nextApp = nextFactory({ dev, dir: nextDir });
const handle = nextApp.getRequestHandler();

async function start() {
  await nextApp.prepare();

  // Pass all non-API routes to Next.js.
  app.all("*", (req, res) => {
    if (
      req.path.startsWith("/auth") ||
      req.path.startsWith("/products") ||
      req.path.startsWith("/categories") ||
      req.path.startsWith("/blog") ||
      req.path.startsWith("/comparisons") ||
      req.path.startsWith("/analytics") ||
      req.path.startsWith("/automation") ||
      req.path.startsWith("/go/") ||
      req.path === "/health"
    ) {
      return res.status(404).json({ message: "API route not found" });
    }

    return handle(req, res);
  });

  app.listen(env.port, () => {
    console.log(`Combined app running on port ${env.port}`);
  });

  startDailyPriceCron();
}

start().catch((error) => {
  console.error("Failed to start combined app", error);
  process.exit(1);
});
