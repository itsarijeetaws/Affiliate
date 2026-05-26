import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import { authRouter } from "./routes/auth.routes.js";
import { productsRouter } from "./routes/products.routes.js";
import { automationRouter } from "./routes/automation.routes.js";
import { redirectRouter } from "./routes/redirect.routes.js";
import { analyticsRouter } from "./routes/analytics.routes.js";
import { categoriesRouter } from "./routes/categories.routes.js";
import { blogRouter } from "./routes/blog.routes.js";
import { comparisonsRouter } from "./routes/comparisons.routes.js";

export const app = express();
app.set("trust proxy", 1);

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.use(compression());
// Only parse JSON body for Express API paths.
// Skipping for all other paths (e.g. /api/backend/*) leaves the raw
// IncomingMessage stream unconsumed so Next.js proxy routes can read it.
const _jsonParser = express.json({ limit: "2mb" });
app.use((req, res, next) => {
  if (
    req.path.startsWith("/auth") ||
    req.path.startsWith("/products") ||
    req.path.startsWith("/categories") ||
    req.path.startsWith("/api/blog") ||
    req.path.startsWith("/comparisons") ||
    req.path.startsWith("/analytics") ||
    req.path.startsWith("/automation") ||
    req.path.startsWith("/go/") ||
    req.path === "/health"
  ) {
    return _jsonParser(req, res, next);
  }
  next();
});
app.use(morgan("combined"));
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (env.frontendOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    }
  })
);

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false
  })
);

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "affiliate-backend", timestamp: new Date().toISOString() });
});

app.use("/auth", authRouter);
app.use("/products", productsRouter);
app.use("/categories", categoriesRouter);
app.use("/api/blog", blogRouter);
app.use("/comparisons", comparisonsRouter);
app.use("/analytics", analyticsRouter);
app.use("/automation", automationRouter);
app.use("/", redirectRouter);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(500).json({ message: "Unhandled server error", error: String(error) });
});
