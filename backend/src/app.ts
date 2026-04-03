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

app.use(helmet());
app.use(compression());
app.use(express.json({ limit: "2mb" }));
app.use(morgan("combined"));
app.use(cors({ origin: env.frontendUrl }));

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
