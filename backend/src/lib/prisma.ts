import { PrismaClient } from "@prisma/client";

function buildUrl(rawUrl: string | undefined): string | undefined {
  if (!rawUrl) return rawUrl;

  try {
    const url = new URL(rawUrl);

    // Swap hstgr.io to localhost for Hostinger internal routing
    if (url.hostname.includes("hstgr.io")) {
      url.hostname = "localhost";
    }

    // Force connection_limit=1 to prevent Rust engine timer panic on
    // Phusion Passenger environments (multiple concurrent init calls)
    url.searchParams.set("connection_limit", "1");
    url.searchParams.set("pool_timeout", "20");
    url.searchParams.set("connect_timeout", "10");

    return url.toString();
  } catch {
    return rawUrl;
  }
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    datasources: {
      db: { url: buildUrl(process.env.DATABASE_URL) }
    },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  });
}

// Singleton with auto-reconnect on panic
let _prisma: PrismaClient = createPrismaClient();

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    return (_prisma as unknown as Record<string | symbol, unknown>)[prop];
  }
});

// Recreate client after a Rust panic so the process keeps serving requests
// instead of dying and requiring a container restart
process.on("unhandledRejection", (reason) => {
  if (
    reason instanceof Error &&
    reason.constructor.name === "PrismaClientRustPanicError"
  ) {
    console.error("[Prisma] Rust engine panic detected — recreating client...");
    void _prisma.$disconnect().catch(() => {});
    _prisma = createPrismaClient();
    // Reconnect so the new instance is warmed up before the next request
    void _prisma.$connect().catch((err: unknown) => {
      console.error("[Prisma] Reconnect failed:", err);
    });
  }
});
