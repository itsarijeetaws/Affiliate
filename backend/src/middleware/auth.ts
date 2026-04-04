import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function requireAdminAuth(req: Request, res: Response, next: NextFunction): void {
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
      !payload.email ||
      typeof payload.email !== "string" ||
      typeof payload.id !== "number" ||
      typeof payload.isAdmin !== "boolean"
    ) {
      res.status(401).json({ message: "Invalid token payload" });
      return;
    }

    if (!payload.isAdmin) {
      res.status(403).json({ message: "Admin access required" });
      return;
    }

    req.user = payload as typeof payload & { id: number; email: string; isAdmin: boolean };
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
}

export function requireAutomationApiKey(req: Request, res: Response, next: NextFunction): void {
  const key = req.header("x-automation-api-key") ?? req.header("x-automation-key");

  if (!key || key !== env.automationApiKey) {
    res.status(401).json({ message: "Invalid automation API key" });
    return;
  }

  next();
}
