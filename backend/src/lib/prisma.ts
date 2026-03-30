import { PrismaClient } from "@prisma/client";

let dbUrl = process.env.DATABASE_URL;
try {
  if (dbUrl) {
    const parsedUrl = new URL(dbUrl);
    if (parsedUrl.hostname.includes("hstgr.io")) {
      parsedUrl.hostname = "localhost";
      dbUrl = parsedUrl.toString();
    }
  }
} catch (e) {
  // Ignore parse errors
}

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl,
    },
  },
});
