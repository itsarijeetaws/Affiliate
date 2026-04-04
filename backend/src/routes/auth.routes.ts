import { Router } from "express";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { env } from "../config/env.js";
import { db } from "../lib/db.js";
import { validateBody } from "../middleware/validate.js";
import * as schema from "../db/schema.js";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().trim().min(2).max(120).optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export const authRouter = Router();

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isAdminEmail(email: string): boolean {
  return env.adminEmails.includes(normalizeEmail(email));
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, passwordHash: string): boolean {
  const [salt, storedHash] = passwordHash.split(":");
  if (!salt || !storedHash) return false;

  const hashedBuffer = scryptSync(password, salt, 64);
  const storedBuffer = Buffer.from(storedHash, "hex");

  if (hashedBuffer.length !== storedBuffer.length) return false;
  return timingSafeEqual(hashedBuffer, storedBuffer);
}

function signAuthToken(user: { id: number; email: string; isAdmin: boolean }) {
  return jwt.sign({ id: user.id, email: user.email, isAdmin: user.isAdmin }, env.jwtSecret, { expiresIn: "12h" });
}

authRouter.post("/register", validateBody(registerSchema), async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password);
  const name = typeof req.body.name === "string" ? req.body.name.trim() : null;

  const [existingUser] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
  if (existingUser) {
    res.status(409).json({ message: "An account with this email already exists" });
    return;
  }

  const isAdmin = isAdminEmail(email);
  await db.insert(schema.users).values({
    email,
    name,
    passwordHash: hashPassword(password),
    isAdmin
  });

  const [createdUser] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
  if (!createdUser) {
    res.status(500).json({ message: "Account created but could not be loaded" });
    return;
  }

  const token = signAuthToken(createdUser);
  res.status(201).json({
    token,
    user: {
      id: createdUser.id,
      email: createdUser.email,
      name: createdUser.name,
      isAdmin: createdUser.isAdmin
    }
  });
});

authRouter.post("/login", validateBody(loginSchema), async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password);

  let [user] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);

  if (!user && isAdminEmail(email) && password === env.adminPassword) {
    await db.insert(schema.users).values({
      email,
      name: "Admin",
      passwordHash: hashPassword(password),
      isAdmin: true
    });
    [user] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
  }

  if (!user || !verifyPassword(password, user.passwordHash)) {
    res.status(401).json({ message: "Invalid credentials" });
    return;
  }

  const shouldBeAdmin = isAdminEmail(user.email);
  if (user.isAdmin !== shouldBeAdmin) {
    await db.update(schema.users)
      .set({ isAdmin: shouldBeAdmin, updatedAt: new Date() })
      .where(eq(schema.users.id, user.id));

    [user] = await db.select().from(schema.users).where(eq(schema.users.id, user.id)).limit(1);
  }

  if (!user) {
    res.status(401).json({ message: "Invalid credentials" });
    return;
  }

  const token = signAuthToken(user);
  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      isAdmin: user.isAdmin
    }
  });
});

authRouter.get("/me", async (req, res) => {
  const authorization = req.header("authorization");
  if (!authorization || !authorization.startsWith("Bearer ")) {
    res.status(401).json({ message: "Missing bearer token" });
    return;
  }

  const token = authorization.replace("Bearer ", "").trim();

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    if (
      typeof payload === "string" ||
      typeof payload.id !== "number" ||
      typeof payload.email !== "string" ||
      typeof payload.isAdmin !== "boolean"
    ) {
      res.status(401).json({ message: "Invalid token payload" });
      return;
    }

    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, payload.id)).limit(1);
    if (!user) {
      res.status(401).json({ message: "User not found" });
      return;
    }

    const isAdmin = isAdminEmail(user.email);
    if (user.isAdmin !== isAdmin) {
      await db.update(schema.users)
        .set({ isAdmin, updatedAt: new Date() })
        .where(eq(schema.users.id, user.id));
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isAdmin
      }
    });
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
});
