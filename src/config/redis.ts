import { APP_CONFIG } from "@/config/app.config";
import { toUTC } from "@/utils/date-time";
import { createRedisKey, replaceRedisPrefix } from "@/utils/redis";
import { Cluster, Redis } from "ioredis";
import CircuitBreaker from "opossum";
import * as promClient from "prom-client";
import { logger } from "./logger";

// Metrics
const redisMetrics = {
  operations: new promClient.Counter({
    name: "redis_operations_total",
    help: "Total Redis operations",
    labelNames: ["operation", "status"],
  }),
  latency: new promClient.Histogram({
    name: "redis_operation_latency_seconds",
    help: "Redis operation latency",
    labelNames: ["operation"],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  }),
  connections: new promClient.Gauge({
    name: "redis_connections",
    help: "Redis connection status",
    labelNames: ["type"],
  }),
  errors: new promClient.Counter({
    name: "redis_errors_total",
    help: "Total Redis errors",
    labelNames: ["type"],
  }),
};

interface IRedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  retryStrategy?: (times: number) => number | null | void;
  maxRetriesPerRequest?: number;
  enableReadyCheck?: boolean;
  connectTimeout?: number;
  lazyConnect?: boolean;
  tls?: any;
  sentinels?: Array<{ host: string; port: number }>;
  name?: string;
  role?: "master" | "slave";
  cluster?: boolean;
  nodes?: Array<{ host: string; port: number }>;
}

export interface IRedisOperationOptions {
  timeout?: number;
  retries?: number;
  fallback?: any;
  circuitBreaker?: boolean;
}

interface IRedisHealthStatus {
  healthy: boolean;
  latency: number;
  connected: boolean;
  ready: boolean;
  lastError?: string;
  stats: {
    totalCommands: number;
    failedCommands: number;
    avgLatency: number;
  };
}

export class RedisClient {
  private _client: Redis | Cluster | null = null;
  private _config: IRedisConfig;
  private _isConnected = false;
  private _isReady = false;
  private _healthCheckInterval: NodeJS.Timeout | null = null;
  private _stats = {
    totalCommands: 0,
    failedCommands: 0,
    successfulCommands: 0,
    totalLatency: 0,
  };
  private _circuitBreaker: CircuitBreaker;
  private _connectionPool: Map<string, Redis> = new Map();
  private _readReplicas: Redis[] = [];

  constructor(config?: Partial<IRedisConfig>) {
    this._config = this.mergeConfig(config);
    // Fix circuit breaker to accept a function without parameters
    this._circuitBreaker = new CircuitBreaker(
      this.executeCommand.bind(this), // Bind the executeCommand method,
      {
        timeout: 5000,
        errorThresholdPercentage: 50,
        resetTimeout: 30000,
        rollingCountTimeout: 10000,
        rollingCountBuckets: 10,
        name: "redis-client",
      }
    );

    this.setupCircuitBreakerEvents();
    this.setupMetrics();
    this.connect();
  }
  public get isConnected(): boolean {
    return this._isConnected;
  }
  public set isConnected(isConnected: boolean) {
    this._isConnected = isConnected;
  }
  public set isReady(isReady: boolean) {
    this._isReady = isReady;
  }
  public get isReady(): boolean {
    return this._isReady;
  }

  public get client(): Redis | Cluster | null {
    return this._client;
  }
  public set client(redis: Redis | Cluster | null) {
    this._client = redis;
  }

  private mergeConfig(config?: Partial<IRedisConfig>): IRedisConfig {
    const defaultConfig: IRedisConfig = {
      host: APP_CONFIG.REDIS_HOST!,
      port: APP_CONFIG.REDIS_PORT!,
      password: APP_CONFIG.REDIS_PASSWORD,
      db: APP_CONFIG.REDIS_DB,
      keyPrefix: APP_CONFIG.REDIS_KEY_PREFIX,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      connectTimeout: 10000,
      lazyConnect: true,
      retryStrategy: (times) => {
        if (times > 10) {
          logger.error("Redis connection failed after 10 retries");
          return null;
        }

        const delay = Math.min(times * 100, 3000);
        logger.warn(
          `Retrying Redis connection in ${delay}ms (attempt ${times})`
        );
        return delay;
      },
    };

    return { ...defaultConfig, ...config };
  }
  // Update the setupCircuitBreakerEvents method to handle the new signature:
  private setupCircuitBreakerEvents(): void {
    this._circuitBreaker.on("open", () => {
      logger.error("Redis circuit breaker opened");
      redisMetrics.errors.inc({ type: "circuit-breaker-open" });
    });

    this._circuitBreaker.on("halfOpen", () => {
      logger.info("Redis circuit breaker half-open");
    });

    this._circuitBreaker.on("close", () => {
      logger.info("Redis circuit breaker closed");
    });

    // Remove or update the fallback since we're handling it differently
    this._circuitBreaker.fallback((_err, args) => {
      logger.warn(
        "Using circuit breaker fallback for operation:",
        args?.operation
      );
      return args?.options?.fallback !== undefined
        ? args.options.fallback
        : null;
    });
  }
  private setupMetrics(): void {
    // Register metrics endpoint
    if (process.env.NODE_ENV === "production") {
      setInterval(() => {
        this.collectMetrics();
      }, 30000);
    }
  }

  private collectMetrics(): void {
    const status = this.getHealthStatus();

    redisMetrics.connections.set({ type: "primary" }, status.connected ? 1 : 0);
    redisMetrics.connections.set({ type: "ready" }, status.ready ? 1 : 0);
  }

  public async connect(): Promise<void> {
    if (this.isConnected && this.client) {
      logger.warn("Redis already connected");
      return;
    }

    try {
      if (this._config.cluster && this._config.nodes) {
        this.client = new Cluster(this._config.nodes, {
          keyPrefix: this._config.keyPrefix,

          redisOptions: {
            password: this._config.password,
            db: this._config.db,
          },
          clusterRetryStrategy: this._config.retryStrategy,

          enableReadyCheck: this._config.enableReadyCheck,
          lazyConnect: this._config.lazyConnect,
        });
      } else {
        this.client = new Redis({
          host: this._config.host,
          port: this._config.port,
          password: this._config.password,
          db: this._config.db,
          keyPrefix: this._config.keyPrefix,
          retryStrategy: this._config.retryStrategy,
          maxRetriesPerRequest: this._config.maxRetriesPerRequest,
          enableReadyCheck: this._config.enableReadyCheck,
          connectTimeout: this._config.connectTimeout,
          lazyConnect: this._config.lazyConnect,
          tls: this._config.tls,
          reconnectOnError: (err) => {
            const targetErrors = ["READONLY", "ETIMEDOUT", "ECONNREFUSED"];
            return targetErrors.some((target) => err.message.includes(target));
          },
        });
      }

      this.setupEventListeners();
      // ========== ADD CONNECTION WAITING LOGIC HERE ==========
      // Explicitly connect if not lazyConnect
      if (this._config.lazyConnect) {
        // Start the connection
        await this.client.connect();

        // Wait for the 'ready' event
        await this.waitForReady();
      } else {
        // For lazyConnect: true, just wait for connection if already started
        if (
          this.client.status === "connecting" ||
          this.client.status === "connect"
        ) {
          await this.waitForReady();
        }
      }

      // Setup read replicas if configured
      await this.setupReadReplicas();

      // Start health checks
      this.startHealthChecks();

      logger.info("Redis client connected successfully", {
        host: this._config.host,
        port: this._config.port,
        mode: this._config.cluster ? "cluster" : "standalone",
        status: this.client?.status,
      });
    } catch (error) {
      logger.error("Failed to connect to Redis:", error);
      throw error;
    }
  }
  // ========== ADD THIS HELPER METHOD ==========
  /**
   * Wait for Redis to be ready
   */
  private async waitForReady(): Promise<void> {
    if (!this.client) {
      throw new Error("Redis client not initialized");
    }

    // If already ready, return immediately
    if (this.client.status === "ready") {
      this.isConnected = true;
      this.isReady = true;
      return;
    }

    // Wait for ready event
    await new Promise<void>((resolve, reject) => {
      const onReady = () => {
        cleanup();
        this.isConnected = true;
        this.isReady = true;
        resolve();
      };

      const onError = (error: Error) => {
        cleanup();
        this.isConnected = false;
        this.isReady = false;
        reject(error);
      };

      const cleanup = () => {
        this.client?.removeListener("ready", onReady);
        this.client?.removeListener("error", onError);
      };

      // Set timeout
      const timeout = setTimeout(() => {
        cleanup();
        reject(
          new Error(
            `Redis connection timeout (${this._config.connectTimeout}ms)`
          )
        );
      }, this._config.connectTimeout || 10000);

      // Listen for events
      this.client?.once("ready", onReady);
      this.client?.once("error", onError);
    });
  }
  private setupEventListeners(): void {
    if (!this.client) return;

    this.client.on("connect", () => {
      this.isConnected = true;
      logger.info("Redis connected at " + toUTC(new Date()));
      redisMetrics.connections.set({ type: "primary" }, 1);
    });

    this.client.on("ready", () => {
      this.isReady = true;
      logger.info("Redis ready for commands");
      redisMetrics.connections.set({ type: "ready" }, 1);
    });

    this.client.on("error", (error) => {
      logger.error("Redis error:", error);
      this.isReady = false;
      redisMetrics.errors.inc({ type: "client-error" });
      redisMetrics.connections.set({ type: "ready" }, 0);
    });

    this.client.on("close", () => {
      this.isConnected = false;
      this.isReady = false;
      logger.warn("Redis connection closed");
      redisMetrics.connections.set({ type: "primary" }, 0);
      redisMetrics.connections.set({ type: "ready" }, 0);
    });

    this.client.on("reconnecting", (delay) => {
      logger.warn(`Redis reconnecting in ${delay}ms`);
    });

    this.client.on("end", () => {
      this.isConnected = false;
      this.isReady = false;
      logger.warn("Redis connection ended");
    });
  }

  private async setupReadReplicas(): Promise<void> {
    if (process.env.REDIS_READ_REPLICAS) {
      const replicas = process.env.REDIS_READ_REPLICAS?.split(",");

      for (const replica of replicas) {
        const [host, port] = replica.split(":");
        const replicaClient = new Redis({
          ...this._config,
          host,
          port: parseInt(port + ""),
          password: this._config.password,
          db: this._config.db,
          role: "slave",
          keyPrefix: this._config.keyPrefix,
          lazyConnect: this._config.lazyConnect,
        });

        this._readReplicas.push(replicaClient);
      }
    }
  }

  private getReadClient(): Redis | Cluster {
    if (this._readReplicas?.length > 0) {
      const replica =
        this._readReplicas[
          Math.floor(Math.random() * this._readReplicas.length)
        ];
      return replica as Redis;
    }
    return this.client!;
  }

  private async executeCommand<T>(
    operation: string,
    fn: (client: Redis | Cluster) => Promise<T>,
    options: IRedisOperationOptions = {}
  ): Promise<T> {
    const startTime = Date.now();
    const timer = redisMetrics.latency.startTimer({ operation });

    try {
      if (!this.client || !this._isReady) {
        throw new Error("Redis client not ready");
      }
      const client =
        operation.startsWith("get") ||
        operation === "mget" ||
        operation == "scan"
          ? this.getReadClient()
          : this.client;

      const result = await fn?.(client);

      this._stats.totalCommands++;
      this._stats.successfulCommands++;
      this._stats.totalLatency += Date.now() - startTime;

      redisMetrics.operations.inc({ operation, status: "success" });

      return result;
    } catch (error: any) {
      this._stats.totalCommands++;
      this._stats.failedCommands++;

      redisMetrics.operations.inc({ operation, status: "error" });
      redisMetrics.errors.inc({ type: "operation-failed" });

      logger.error(`Redis operation failed: ${operation}`, {
        error: error.message,
        duration: Date.now() - startTime,
      });

      if (options.fallback !== undefined) {
        return options.fallback;
      }

      throw error;
    } finally {
      timer();
    }
  }

  private async safeOperation<T extends unknown = null>(
    operation: string,
    fn: (client: Redis | Cluster) => Promise<T>,
    options: IRedisOperationOptions = {}
  ): Promise<T> {
    try {
      if (options.circuitBreaker !== false) {
        return await this._circuitBreaker.fire(operation, fn, options);
      }
      return await this.executeCommand<T>(operation, fn, options);
    } catch (error) {
      logger.error(`Redis safe operation failed: ${operation}`, error);
      return options.fallback !== undefined ? options.fallback : (null as T);
    }
  }

  // Public API Methods
  public async sadd(
    key: string,
    members: (string | number | Buffer<ArrayBufferLike>)[],
    options: IRedisOperationOptions = {}
  ): Promise<number | null> {
    if (!key) return null;
    return await this.safeOperation(
      "sadd",
      async (client) => await client.sadd(key, ...members),
      options
    );
  }

  public async srem(
    key: string,
    members: (string | number | Buffer<ArrayBufferLike>)[],
    options: IRedisOperationOptions = {}
  ): Promise<number | null> {
    if (!key) return null;
    return await this.safeOperation(
      "srem",
      async (client) => await client.srem(key, ...members),
      { fallback: 0, ...options }
    );
  }

  public async smembers(
    key: string,
    options: IRedisOperationOptions = {}
  ): Promise<string[] | null> {
    if (!key) return null;
    return await this.safeOperation(
      "smembers",
      async (client) => await client.smembers(key),
      { fallback: [], ...options }
    );
  }

  public async set(
    key: string,
    value: any,
    ttl?: number,
    options?: IRedisOperationOptions
  ): Promise<boolean> {
    if (!key) return false;

    const valueToStore =
      typeof value === "string" ? value : JSON.stringify(value);

    const result = await this.safeOperation<"OK" | null>(
      "set",
      async (client) => {
        if (ttl) {
          return await client.set(key, valueToStore, "EX", ttl);
        }
        return await client.set(key, valueToStore);
      },
      options
    );
    return result == "OK";
  }
  public async setnx(
    key: string,
    value: any,
    ttl: number | null | undefined = null,
    options?: IRedisOperationOptions
  ): Promise<boolean> {
    if (!key) return false;

    const valueToStore =
      typeof value === "string" ? value : JSON.stringify(value);

    const result = await this.safeOperation<"OK" | null>(
      "set",
      async (client) => {
        if (ttl != null) {
          return await client.set(key, valueToStore, "EX", ttl, "NX");
        }
        return await client.set(key, valueToStore, "NX");
      },
      options
    );
    return result == "OK";
  }

  public async get<T = any>(
    key: string,
    options?: IRedisOperationOptions
  ): Promise<T | null> {
    if (!key) return null;
    const result = await this.getString(key, options);
    if (!result) return null;

    try {
      return JSON.parse(result) as T;
    } catch {
      return result as unknown as T;
    }
  }

  public async getString(
    key: string,
    options?: IRedisOperationOptions
  ): Promise<string | null> {
    if (!key) return null;
    return await this.safeOperation(
      "get",
      async (client) => await client.get(key),
      options
    );
  }

  public async del(
    key: string | string[],
    options?: IRedisOperationOptions
  ): Promise<number> {
    if (!key) return 0;
    const keys = Array.isArray(key) ? key : [key];

    return await this.safeOperation<number>(
      "del",
      async (client) => client.del(keys),
      options
    );
  }

  public async mget<T = any>(
    keys: string[],
    options?: IRedisOperationOptions
  ): Promise<(T | null)[]> {
    if (!keys) return [];
    const results = await this.safeOperation<(string | null)[]>(
      "mget",
      async (client) => await client.mget(keys),
      { fallback: [], ...options }
    );

    return results.map((result) => {
      if (!result) return null;
      try {
        return JSON.parse(result) as T;
      } catch {
        return result as unknown as T;
      }
    });
  }

  public async setex(
    key: string,
    seconds: number,
    value: any,
    options?: IRedisOperationOptions
  ): Promise<boolean> {
    if (!key) return false;
    return this.set(key, value, seconds, options);
  }

  public async expire(
    key: string,
    seconds: number,
    options?: IRedisOperationOptions
  ): Promise<boolean> {
    if (!key) return false;
    const result = await this.safeOperation<number>(
      "expire",
      async (client) => await client.expire(key, seconds),
      options
    );
    return result === 1;
  }

  public async exists(
    key: string,
    options?: IRedisOperationOptions
  ): Promise<boolean> {
    if (!key) return false;
    const result = await this.safeOperation<number>(
      "exists",
      async (client) => await client.exists(key),
      options
    );
    return result === 1;
  }

  public async incr(
    key: string,
    options?: IRedisOperationOptions
  ): Promise<number> {
    if (!key) return 0;
    return await this.safeOperation<number>(
      "incr",
      async (client) => await client.incr(key),
      { fallback: 0, ...options }
    );
  }

  public async decr(
    key: string,
    options?: IRedisOperationOptions
  ): Promise<number> {
    if (!key) return 0;
    return await this.safeOperation(
      "decr",
      async (client) => await client.decr(key),
      { fallback: 0, ...options }
    );
  }

  public async hset(
    key: string,
    field: string,
    value: any,
    options: IRedisOperationOptions = {}
  ): Promise<number> {
    if (!key) return 0;

    const valueToStore =
      typeof value === "string" ? value : JSON.stringify(value);

    return await this.safeOperation<number>(
      "hset",
      async (client) => await client.hset(key, field, valueToStore),
      { fallback: 0, ...options }
    );
  }

  public async hget<T = any>(
    key: string,
    field: string,
    options?: IRedisOperationOptions
  ): Promise<T | null> {
    if (!key) return null;
    const result = await this.safeOperation<string | null>(
      "hget",
      async (client) => await client.hget(key, field),
      options
    );

    if (!result) return null;
    try {
      return JSON.parse(result) as T;
    } catch {
      return result as unknown as T;
    }
  }

  public async hdel(
    key: string,
    ...fields: (string | Buffer<ArrayBufferLike>)[]
  ): Promise<number | null> {
    if (!key) return null;
    return await this.safeOperation("hdel", async (client) => {
      return await client.hdel(key, ...fields);
    });
  }

  public async hgetall<T = any>(
    key: string,
    options?: IRedisOperationOptions
  ): Promise<Record<string, T> | null> {
    if (!key) return null;
    const result = await this.safeOperation(
      "hgetall",
      async (client) => await client.hgetall(key),
      options
    );

    if (!result) return null;
    const parsed: Record<string, T> = {};
    for (const [key, value] of Object.entries(result)) {
      try {
        parsed[key] = JSON.parse(value);
      } catch {
        parsed[key] = value as unknown as T;
      }
    }
    return parsed;
  }

  public publish = async ({
    channel,
    message,
    options = {},
  }: {
    channel?: string;
    message?: Record<string, unknown> | string | number;
    options?: IRedisOperationOptions;
  }): Promise<number> => {
    if (!channel) return 0;
    const messageToSend =
      typeof message == "string"
        ? message
        : typeof message == "number"
        ? `${message}`
        : JSON.stringify(message || {});
    return await this.safeOperation<number>(
      "publish",
      async (client) => await client.publish(channel, messageToSend),
      { fallback: 0, ...options }
    );
  };

  public async subscribe(
    channel: string,
    callback: (message: string, channel: string) => void
  ): Promise<void> {
    if (!channel) return;
    if (!this.client) throw new Error("Redis client not connected");

    await this.client.subscribe(channel);
    this.client.on("message", (ch, message) => {
      if (ch === channel) {
        callback(message, channel);
      }
    });
  }

  public async keys(key?: string): Promise<string[] | null> {
    if (!key) return null;
    return await this.safeOperation("keys", async (client) => {
      return await client.keys(key);
    });
  }
  public async removeStream(
    pattern: string,
    batchSize = 500
  ): Promise<boolean> {
    if (!pattern) return false;
    let deleted = 0;
    const stream = (this.client! as Redis).scanStream({
      match: createRedisKey(pattern),
      count: batchSize,
    });
    stream.on("data", async (keys) => {
      stream.pause();
      if (keys.length) {
        deleted += 1;
        const pipeline = this.pipeline();
        keys.forEach((k: string) => pipeline.del(replaceRedisPrefix(k)));
        await pipeline.exec();
      }
      stream.resume();
    });
    return new Promise<boolean>((resolve, reject) => {
      stream.on("error", () => {
        reject(false);
      });
      stream.on("end", () => {
        resolve(deleted > 0);
      });
    });
  }

  public async remove(pattern: string, batchSize = 500): Promise<boolean> {
    let cursor = "0";
    if (!pattern) return false;
    if (!this._config.cluster) {
      return await this.removeStream(pattern, batchSize);
    }
    let deleted = 0;

    do {
      const scanResult = await this.safeOperation("scan", async () => {
        return await this.scan(cursor, pattern, batchSize);
      });
      if (!scanResult) break;
      const [nextCursor, keys] = scanResult;
      cursor = nextCursor;

      if (keys.length) {
        deleted += 1;

        const pipeline = this.pipeline();
        keys.forEach((k: string) => pipeline.del(replaceRedisPrefix(k)));
        await pipeline.exec();
      }
    } while (cursor != "0");
    return deleted > 0;
  }

  public pipeline() {
    if (!this.client) throw new Error("Redis client not connected");
    return this.client.pipeline();
  }

  public multi() {
    if (!this.client) throw new Error("Redis client not connected");
    return this.client.multi();
  }

  public async scan(
    cursor: string,
    pattern?: string,
    count: number = 500
  ): Promise<[string, string[]] | null> {
    if (!pattern) return null;
    const key = createRedisKey(pattern);
    return await this.safeOperation("scan", async (client) => {
      const result = await client.scan(cursor, "MATCH", key, "COUNT", count);
      return result;
    });
  }

  private startHealthChecks(): void {
    this._healthCheckInterval = setInterval(async () => {
      try {
        await this.client?.ping();
        logger.debug("Redis health check passed");
      } catch (error: any) {
        logger.error("Redis health check failed:", error);
        redisMetrics.errors.inc({ type: "health-check-failed" });
      }
    }, 30000);
  }

  public async ping(): Promise<string> {
    return await this.safeOperation<string>("ping", async (client) => {
      return await client.ping();
    });
  }

  public getHealthStatus(): IRedisHealthStatus {
    const avgLatency =
      this._stats.successfulCommands > 0
        ? this._stats.totalLatency / this._stats.successfulCommands
        : 0;

    return {
      healthy: this.isConnected && this.isReady,
      latency: avgLatency,
      connected: this.isConnected,
      ready: this.isReady,
      stats: {
        totalCommands: this._stats.totalCommands,
        failedCommands: this._stats.failedCommands,
        avgLatency,
      },
    };
  }

  public async disconnect(): Promise<void> {
    logger.info("Initiating Redis graceful shutdown");

    if (this._healthCheckInterval) {
      clearInterval(this._healthCheckInterval);
      this._healthCheckInterval = null;
    }

    for (const replica of this._readReplicas) {
      try {
        await replica.quit();
      } catch (error) {
        logger.warn("Error closing Redis replica:", error);
      }
    }

    if (this.client) {
      try {
        await this.client.quit();
        logger.info("Redis connection closed gracefully");
      } catch (error) {
        logger.error("Error closing Redis connection:", error);
        try {
          await this.client.disconnect();
        } catch (disconnectError) {
          logger.error("Error disconnecting Redis:", disconnectError);
        }
      } finally {
        this.client = null;
        this.isConnected = false;
        this.isReady = false;
      }
    }
  }

  public async getConnectionForDb(db: number): Promise<Redis> {
    const key = `db_${db}`;
    if (!this._connectionPool.has(key)) {
      const connection = new Redis({
        host: this._config.host,
        port: this._config.port,
        password: this._config.password,
        db,
        retryStrategy: this._config.retryStrategy,
      });

      this._connectionPool.set(key, connection);
      connection.on("error", (error) => {
        logger.error(`Redis connection error for db ${db}:`, error);
        this._connectionPool.delete(key);
      });
    }
    return this._connectionPool.get(key)!;
  }

  public async flushDb(): Promise<boolean> {
    if (APP_CONFIG.NODE_ENV === "production") {
      logger.warn("flushDb called in production environment");
      return false;
    }
    const result = await this.safeOperation<string>(
      "flushdb",
      async (client) => await client.flushdb()
    );
    return result === "OK";
  }

  public async getMetrics(): Promise<string> {
    return promClient.register.metrics();
  }
}

// Default export with singleton access
export default new RedisClient();
