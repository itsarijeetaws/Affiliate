import { PrismaClient } from "@prisma/client";

function buildUrl(rawUrl: string | undefined): string | undefined {
  if (!rawUrl) return rawUrl;
  try {
    const url = new URL(rawUrl);
    // Swap hstgr.io to localhost for Hostinger internal routing
    if (url.hostname.includes("hstgr.io")) {
      url.hostname = "localhost";
    }
    return url.toString();
  } catch {
    return rawUrl;
  }
}

// Simple singleton — no Proxy, no eager connect.
// Lazy initialization means Prisma's Tokio runtime starts AFTER
// Phusion Passenger has fully settled its SIGALRM signal handlers.
export const prisma = new PrismaClient({
  datasources: {
    db: { url: buildUrl(process.env.DATABASE_URL) }
  }
});
