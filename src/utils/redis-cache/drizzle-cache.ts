// utils/drizzle-cache.ts
import redisClient, { RedisClient } from "@/config/redis";
import crypto from "crypto";
import { cacheManager, CacheOptions } from "./cache-manager";

export type DrizzleCacheOptions = CacheOptions & {
  cacheKey?: string; // optional custom key
};

export class DrizzleCache {
  private redis: RedisClient;

  constructor(redis: RedisClient = redisClient) {
    this.redis = redis;
  }

  private createKey(query?: any, params?: any, namespace?: string) {
    const raw = JSON.stringify({ query, params });
    const hash = crypto.createHash("sha1").update(raw).digest("hex");

    return namespace ? `${namespace}:${hash}` : hash;
  }

  //   async query<
  //   T extends ReturnType<QB> extends Promise<infer R> ? R : never,
  //   QB extends () => Promise<any>
  // >(
  //   qb: QB, // drizzle query executor

  async query<T>(
    qb: () => Promise<T>, // drizzle query executor
    options: {
      meta?: {
        query?: unknown; // drizzle query object
        params?: unknown; // filters, where, params
      };
      options: DrizzleCacheOptions;
    } = { meta: { query: null, params: null }, options: {} }
  ): Promise<T> {
    const drizzleCacheOptions = options.options || {};
    const { ttl, useCache = true, namespace, cacheKey } = drizzleCacheOptions;
    const meta = options.meta || { query: "", params: "" };

    // custom key or automatic hashed key
    const key = cacheKey
      ? cacheKey
      : this.createKey(meta.query, meta.params, namespace);
    return cacheManager.cache<T>(this.redis, key, qb, {
      ttl,
      useCache,
      namespace,
    });
  }
}
export default new DrizzleCache();
