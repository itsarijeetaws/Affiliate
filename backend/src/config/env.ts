import dotenv from "dotenv";

dotenv.config();

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
  automationApiKey: process.env.AUTOMATION_API_KEY as string,
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:3000",
  redisUrl: process.env.REDIS_URL,
  enableDailyCron: String(process.env.ENABLE_DAILY_CRON ?? "true") === "true",
  wordpressBaseUrl: process.env.WORDPRESS_BASE_URL,
  wordpressUsername: process.env.WORDPRESS_USERNAME,
  wordpressAppPassword: process.env.WORDPRESS_APP_PASSWORD,
  amazonAccessKey: process.env.AMAZON_ACCESS_KEY,
  amazonSecretKey: process.env.AMAZON_SECRET_KEY,
  amazonPartnerTag: process.env.AMAZON_PARTNER_TAG,
  amazonRegion: process.env.AMAZON_REGION ?? "us-east-1"
};
