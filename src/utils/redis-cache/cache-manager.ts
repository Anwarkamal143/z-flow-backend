// utils/cache.manager.ts
// utils/cache.ts
import redisClient, { RedisClient } from "@/config/redis";
import crypto from "crypto";
export type CacheOptions = {
  ttl?: number; // seconds
  useCache?: boolean; // enable/disable
  staleWhileRevalidate?: boolean; // optional SWR mode
  namespace?: string; // prefix grouping
};

// Hash long keys so Redis keys stay clean
const hashKey = (key: string) =>
  crypto.createHash("sha1").update(key).digest("hex");

const buildKey = (namespace: string | undefined, key: string) => {
  const hashed = hashKey(key);
  return namespace ? `${namespace}:${hashed}` : hashed;
};

export const cacheManager = {
  // Lock mechanism
  async acquireLock(
    key: string,
    ttl: number | null | undefined = 10, //Seconds
    retryDelay: number = 100,
    maxRetries: number = 1
  ): Promise<string | null> {
    const lockId =
      Math.random().toString(36).substring(2) + Date.now().toString(36);

    for (let i = 0; i < maxRetries; i++) {
      const acquired = await redisClient.setnx(`lock:${key}`, lockId, ttl, {
        circuitBreaker: false,
      });

      if (acquired) {
        return lockId;
      }

      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }

    return null;
  },

  async releaseLock(key: string, lockId: string): Promise<boolean> {
    const currentLockId = await redisClient.getString(`lock:${key}`);

    if (currentLockId === lockId) {
      await redisClient.del(`lock:${key}`);
      return true;
    }

    return false;
  },
  async releasePatternLock(key: string, batchSize = 100): Promise<boolean> {
    await this.remove(`lock:${key}`, batchSize);
    return true;
  },

  // Rate limiting
  async rateLimit(
    key: string,
    limit: number,
    window: number
  ): Promise<{ allowed: boolean; remaining: number; reset: number }> {
    const now = Date.now();
    const windowStart = now - window * 1000;

    const redisKey = `rate_limit:${key}`;

    // Clean old entries
    await redisClient
      .pipeline()
      .zremrangebyscore(redisKey, 0, windowStart)
      .zadd(redisKey, now, now.toString())
      .zcard(redisKey)
      .expire(redisKey, window * 2)
      .exec();

    const count = (await redisClient.get<number>(`${redisKey}:count`)) || 0;

    if (count >= limit) {
      const oldest = await redisClient.get<number>(`${redisKey}:oldest`);
      const reset = oldest
        ? Math.ceil((oldest + window * 1000 - now) / 1000)
        : window;

      return {
        allowed: false,
        remaining: 0,
        reset,
      };
    }

    await redisClient.incr(`${redisKey}:count`);
    await redisClient.expire(`${redisKey}:count`, window);

    return {
      allowed: true,
      remaining: limit - count - 1,
      reset: window,
    };
  },
  async keys(key?: string) {
    return await redisClient.keys(key);
  },

  async remove(key: string, batchSize = 2000) {
    return await redisClient.remove(key, batchSize);
  },

  async cache<T>(
    redis: RedisClient = redisClient,
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const {
      ttl,
      useCache = true,
      staleWhileRevalidate = false,
      namespace,
    } = options;

    const redisKey = buildKey(namespace, key);

    if (useCache) {
      const cached = await redis.get(redisKey);

      if (cached) {
        const parsed = cached as T;

        // 🚀 Stale While Revalidate
        if (staleWhileRevalidate && ttl) {
          redis.expire(redisKey, ttl); // Refresh TTL in background
        }

        return parsed;
      }
    }

    // Missing or disabled → fetch fresh data
    try {
      let result = (await fetcher()) as any;
      const jsonResult = result.data ? result.data : result;

      if (useCache) {
        const json =
          typeof jsonResult != "string" && jsonResult != null
            ? JSON.stringify(jsonResult)
            : jsonResult;
        ttl
          ? await redis?.set(redisKey, json, ttl)
          : await redis?.set(redisKey, json);
      }
      return result as T;
    } catch (error) {
      return null as unknown as T;
    }
  },
};
