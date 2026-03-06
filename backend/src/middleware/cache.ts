import type { NextFunction, Request, Response } from "express";
import { cacheClient } from "../lib/redis.js";

export function responseCache(prefix: string, ttlSeconds = 300) {
  return async function cacheMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
    const key = `${prefix}:${req.originalUrl}`;
    const cached = await cacheClient.get(key);

    if (cached) {
      res.setHeader("x-cache", "HIT");
      res.json(JSON.parse(cached));
      return;
    }

    const originalJson = res.json.bind(res);
    res.json = (body: unknown) => {
      void cacheClient.setEx(key, ttlSeconds, JSON.stringify(body));
      res.setHeader("x-cache", "MISS");
      return originalJson(body);
    };

    next();
  };
}
