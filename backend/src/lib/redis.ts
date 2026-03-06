import { createRequire } from "module";
import type { Redis as RedisClient } from "ioredis";
import { env } from "../config/env.js";

const require = createRequire(import.meta.url);
const RedisCtor = require("ioredis");

let redis: RedisClient | null = null;

if (env.redisUrl) {
  const instance: RedisClient = new RedisCtor(env.redisUrl, {
    maxRetriesPerRequest: 2,
    lazyConnect: true
  });
  redis = instance;

  instance.connect().catch(() => {
    redis = null;
  });
}

const fallbackCache = new Map<string, { value: string; expiresAt: number }>();

export const cacheClient = {
  async get(key: string): Promise<string | null> {
    if (redis) {
      return redis.get(key);
    }

    const item = fallbackCache.get(key);
    if (!item || item.expiresAt < Date.now()) {
      fallbackCache.delete(key);
      return null;
    }

    return item.value;
  },

  async setEx(key: string, ttlSeconds: number, value: string): Promise<void> {
    if (redis) {
      await redis.setex(key, ttlSeconds, value);
      return;
    }

    fallbackCache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000
    });
  }
};
