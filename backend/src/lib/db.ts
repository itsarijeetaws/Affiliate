import { createRequire } from "module";
import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "../db/schema.js";

// mysql2 is CommonJS — use createRequire in ESM context
const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const mysql = require("mysql2/promise");

function buildConnectionString(): string {
  const rawUrl = process.env.DATABASE_URL ?? "";
  try {
    const url = new URL(rawUrl);
    // Swap Hostinger's external hostname with localhost for internal connectivity
    if (url.hostname.includes("hstgr.io")) {
      url.hostname = "localhost";
    }
    return url.toString();
  } catch {
    return rawUrl;
  }
}

// Pure Node.js mysql2 connection pool — no Rust engine, no SIGALRM conflicts
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
const pool = mysql.createPool({
  uri: buildConnectionString(),
  waitForConnections: true,
  connectionLimit: 5,
});

// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
export const db = drizzle(pool, { schema, mode: "default" });
