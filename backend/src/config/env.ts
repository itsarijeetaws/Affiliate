import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Works from any CWD: resolves to backend/.env regardless of where node is launched from
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const required = ["DATABASE_URL", "JWT_SECRET", "AUTOMATION_API_KEY"];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: process.env.DATABASE_URL as string,
  jwtSecret: process.env.JWT_SECRET as string,
  adminEmail: process.env.ADMIN_EMAIL ?? "admin@example.com",
  adminPassword: process.env.ADMIN_PASSWORD ?? "change-me",
  adminEmails: (process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? "admin@example.com")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
  automationApiKey: process.env.AUTOMATION_API_KEY as string,
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:3000",
  /** Browser origins allowed for CORS (comma-separated). Falls back to FRONTEND_URL. */
  frontendOrigins: (process.env.FRONTEND_URLS ?? process.env.FRONTEND_URL ?? "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  redisUrl: process.env.REDIS_URL,
  enableDailyCron: String(process.env.ENABLE_DAILY_CRON ?? "true") === "true",
  wordpressBaseUrl: process.env.WORDPRESS_BASE_URL,
  wordpressUsername: process.env.WORDPRESS_USERNAME,
  wordpressAppPassword: process.env.WORDPRESS_APP_PASSWORD,
  // Creators API (OAuth2) — preferred
  amazonClientId: process.env.AMAZON_CLIENT_ID,
  amazonClientSecret: process.env.AMAZON_CLIENT_SECRET,
  // Legacy PA API keys — kept for fallback / backwards compat
  amazonAccessKey: process.env.AMAZON_ACCESS_KEY,
  amazonSecretKey: process.env.AMAZON_SECRET_KEY,
  amazonPartnerTag: process.env.AMAZON_PARTNER_TAG ?? process.env.AMAZON_MARKETPLACE_ID,
  amazonRegion: process.env.AMAZON_REGION ?? "ap-southeast-1",
  amazonMarketplaceId: process.env.AMAZON_MARKETPLACE_ID ?? "A21TJRUUN4KGV",
  geminiApiKey: process.env.GEMINI_API_KEY,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  openaiApiKey: process.env.OPENAI_API_KEY
};
