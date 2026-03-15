import { APP_CONFIG } from "@/config/app.config";
import { UnauthorizedException } from "@/utils/catch-errors";
import { toUTC } from "@/utils/date-time";
import { verifyAccessToken } from "@/utils/jwt";

import { createAdapter } from "@socket.io/redis-streams-adapter";
import { Server as HttpServer } from "http";
import CircuitBreaker from "opossum";
import { RateLimiterRedis } from "rate-limiter-flexible";
import { Server, Socket } from "socket.io";
import { logger } from "./logger";
import IoRedis, { RedisClient } from "./redis";

/**
 * Environment variable configuration with defaults
 */
const config = {
  CORS_ORIGIN: process.env.SOCKET_CORS_ORIGIN || "*",
  MAX_EVENTS_PER_MINUTE: APP_CONFIG.SOCKET_RATE_LIMIT || 300,
  HEARTBEAT_INTERVAL: 30000,
  MAX_MISSED_HEARTBEATS: 3,
  REDIS_SOCKET_KEY_PREFIX: "sockets",
  NODE_ENV: APP_CONFIG.NODE_ENV,
  SOCKET_CONNECTION_TIMEOUT: 60000, // 1 minute

  //   ALLOWED_NAMESPACES: (process.env.SOCKET_ALLOWED_NAMESPACES || '/default,/chat,/admin').split(','),
  //   IP_WHITELIST: (process.env.SOCKET_IP_WHITELIST || '').split(',').filter(Boolean),
};

/**
 * Custom extended Socket.IO Socket type with additional properties
 */
type ISocket = Socket & {
  user?: IServerCookieType | null;
  ipAddress?: string;
  connectTime?: number;
};

/**
 * Rate limiter instance
 */

/**
 * Redis circuit breaker configuration
 */
const redisCircuitBreaker = new CircuitBreaker(
  async (fn: Function, ...args: any[]) => {
    return fn(...args);
  },
  {
    timeout: 5000,
    errorThresholdPercentage: 50,
    resetTimeout: 30000,
  }
);

redisCircuitBreaker.fallback(() => {
  logger.error("Redis circuit breaker opened - using fallback");
  return null;
});

/**
 * Enhanced RedisSocket class with production improvements
 */
export class RedisSocket {
  private _io!: Server;
  private _redis!: RedisClient;
  private _monitoringInterval!: NodeJS.Timeout;
  // private socket!: ISocket;
  public metrics = {
    connections: 0,
    disconnections: 0,
    rateLimited: 0,
    errors: 0,
  };
  private rateLimiter: RateLimiterRedis;
  private connectionTimeout: number;
  /**
   *
   */
  constructor() {
    this.redis = IoRedis;
    this.connectionTimeout = config.SOCKET_CONNECTION_TIMEOUT;

    // Rate limit per user instead of per socket
    this.rateLimiter = new RateLimiterRedis({
      storeClient: this.redis.client,
      points: config.MAX_EVENTS_PER_MINUTE,
      duration: 60,
      keyPrefix: "socket_user_rate_limit",
    });
  }
  public get redis() {
    return this._redis;
  }
  public set redis(redis: RedisClient) {
    this._redis = redis;
  }

  public get io() {
    return this._io;
  }

  public set io(io: Server) {
    this._io = io;
  }

  public getkey(key?: string) {
    return `${config.REDIS_SOCKET_KEY_PREFIX}:${key}`;
  }

  /**
   * Safely execute Redis commands with circuit breaker
   */

  private async safeRedisCommand<T>(
    command: (client: RedisClient) => Promise<T>
  ): Promise<T> {
    try {
      return await redisCircuitBreaker.fire(command, this.redis);
    } catch (err) {
      logger.error("Redis command failed in circuit breaker", err);
      // Provide sensible default for array-returning commands
      return [] as unknown as T;
    }
  }

  public connect(httpServer?: HttpServer): Server {
    if (!this.io && httpServer) {
      this.io = new Server(httpServer, {
        cors: {
          origin: config.CORS_ORIGIN,
          methods: ["GET", "POST"],
          credentials: config.NODE_ENV === "production",
        },
        adapter: createAdapter(this.redis.client),
        serveClient: false,
        pingTimeout:
          config.HEARTBEAT_INTERVAL * (config.MAX_MISSED_HEARTBEATS + 1),
        pingInterval: config.HEARTBEAT_INTERVAL,
        connectTimeout: this.connectionTimeout,
        transports: ["websocket", "polling"], // Explicit transport order
      });
      this.setupConnection(this.io);
      this.setupRedisEmitter();
      this.setupMonitoring();
    }
    return this.io;
  }

  /**
   * Setup monitoring and metrics collection
   */

  private setupMonitoring() {
    if (this._monitoringInterval) {
      clearInterval(this._monitoringInterval);
    }

    this._monitoringInterval = setInterval(() => {
      const connectionsCount = this.io?.engine?.clientsCount || 0;
      logger.info("Socket Metrics", {
        ...this.metrics,
        connectionsCount,
        uptime: process.uptime(),
      });
    }, 60000);
  }
  public authenticate(io: Server) {
    io.use(async (socket: ISocket, next) => {
      try {
        // Extract IP address safely
        const xForwardedFor =
          socket.handshake.headers["x-forwarded-for"] ||
          socket.handshake.address;
        socket.ipAddress = Array.isArray(xForwardedFor)
          ? xForwardedFor[0]
          : ((xForwardedFor || socket.handshake.address) as string);

        const token = socket.handshake.auth.token;
        if (!token) {
          this.metrics.errors++;
          return next(
            new UnauthorizedException("Authentication error: Token required")
          );
        }

        const decoded = await verifyAccessToken(token);
        if (!decoded?.data?.user) {
          this.metrics.errors++;
          return next(
            new UnauthorizedException("Authentication error: Invalid token")
          );
        }

        // Validate user has required fields
        if (!decoded.data.user.id) {
          this.metrics.errors++;
          return next(
            new UnauthorizedException("Authentication error: Invalid user data")
          );
        }

        socket.user = decoded.data.user;
        socket.connectTime = Date.now();

        next();
      } catch (error: any) {
        this.metrics.errors++;
        logger.error("Socket authentication failed:", {
          error: error.message,
          ip: socket.ipAddress,
        });
        next(new UnauthorizedException("Authentication error"));
      }
    });
  }

  private socketRateLimitter(socket: ISocket) {
    socket.use(async (_packet, next) => {
      if (!socket.user?.id) {
        return next(new Error("User not authenticated"));
      }

      try {
        // Rate limit per user, not per socket
        await this.rateLimiter.consume(`user:${socket.user.id}`);
        next();
      } catch (err) {
        this.metrics.rateLimited++;
        logger.warn(`Rate limit exceeded for user: ${socket.user.id}`, {
          socketId: socket.id,
        });
        socket.emit("error", {
          message: "Rate limit exceeded",
          code: "RATE_LIMIT",
        });
        socket.disconnect(true);
      }
    });

    // // Heartbeat handler
  }
  public setupConnection(io: Server) {
    this.authenticate(io);

    io.on("connection", async (socket: ISocket) => {
      if (!socket.user?.id) {
        socket.disconnect(true);
        return;
      }
      socket.emit("app:ping", "OK", (val) => {
        console.log(val);
      });

      this.metrics.connections++;

      try {
        // Store socket ID in Redis with user ID
        await this.safeRedisCommand((client) =>
          client.sadd(this.getkey(socket.user!.id), [socket.id])
        );

        // Set expiration for automatic cleanup (e.g., 1 day)

        // await this.safeRedisCommand((client) =>
        //   client.expire(this.getkey(socket.user.id), 86400)
        // );
      } catch (err) {
        logger.error("Failed to store socket ID in Redis:", err);
        this.metrics.errors++;
      }

      logger.info(`Socket connected: ${socket.id}, User: ${socket.user.id}`, {
        ip: socket.ipAddress,
        namespace: socket.nsp.name,
      });
      // Event handlers
      socket.on("join", async (room: string) => {
        console.log("joining room:", room);
        if (!socket.user?.id) return;
        socket.join(room);
      });

      socket.on("leave", async (room: string) => {
        console.log("leaving room:", room);
        if (!socket.user?.id) return;
        socket.leave(room);
      });
      socket.on("join:all", async (room: string) => {
        console.log("join:all joining room:", room);
        if (!socket.user?.id) return;
        await this.joinRoom(socket.user.id, room);
      });
      socket.on("leave:all", async (room: string) => {
        console.log("leave:all leaving room:", room);

        if (!socket.user?.id) return;
        await this.leaveRoom(socket.user.id, room);
      });

      socket.on("disconnect", async (reason) => {
        this.metrics.disconnections++;

        try {
          if (socket.user?.id) {
            socket.rooms.forEach((room) => {
              if (room != socket.id) socket.leave(room);
            });
            await this.safeRedisCommand((client) =>
              client.srem(this.getkey(socket.user!.id), [socket.id])
            );
          }
        } catch (err) {
          logger.error("Failed to remove socket ID from Redis:", err);
          this.metrics.errors++;
        }

        logger.info(`Socket disconnected: ${socket.id}, Reason: ${reason}`, {
          userId: socket.user?.id,
          duration: socket.connectTime ? Date.now() - socket.connectTime : 0,
        });

        socket.user = null;
      });

      socket.on("error", (err) => {
        this.metrics.errors++;
        logger.error(`Socket error: ${socket.id}`, {
          error: err.message,
          userId: socket.user?.id,
          stack: err.stack,
        });
      });

      // Send initial connection acknowledgement
      socket.emit("connected", {
        socketId: socket.id,
        timestamp: Date.now(),
      });
      // Setup rate limiting middleware

      this.socketRateLimitter(socket);

      // Join default rooms
      this.joinDefaultRooms(socket);
    });
  }

  async setupRedisEmitter() {
    const sub = this.redis.client?.duplicate();
    await sub?.connect();
    const channelKey = APP_CONFIG.REDIS_SOCKET_EMITTER;
    await sub?.subscribe(channelKey);

    sub?.on("message", (channel: string, message: string) => {
      if (channel != channelKey) return;
      try {
        const { channel: room, event, ...rest } = JSON.parse(message || "{}");
        if (!room || !event) return;
        this.io.to(room).emit(event, { ...rest, channel: room });
      } catch (err) {
        logger.error("Failed to process socket emit event", err);
        this.metrics.errors++;
      }
    });
  }

  public joinDefaultRooms(socket: ISocket) {
    if (!socket.user?.id) return;

    try {
      socket.join(`user:${socket.user.id}`);

      if ((socket.user as any)?.role) {
        socket.join(`role:${(socket.user as any).role}`);
      }

      if ((socket.user as any)?.namespace) {
        socket.join(`ns:${(socket.user as any).namespace}`);
      }
    } catch (err) {
      logger.error("Failed to join default rooms:", err);
      this.metrics.errors++;
    }
  }

  public async joinRoom(userId: string, room: string) {
    const sockets = await this.getUserSockets(userId);
    sockets.forEach((socket) => {
      try {
        socket.join(room);
      } catch (err) {
        logger.error(
          `Failed to join room ${room} for socket ${socket.id}:`,
          err
        );
        this.metrics.errors++;
      }
    });
  }

  public async leaveRoom(userId: string, room: string) {
    const sockets = await this.getUserSockets(userId);
    sockets.forEach((socket) => {
      try {
        socket.leave(room);
      } catch (err) {
        logger.error(
          `Failed to leave room ${room} for socket ${socket.id}:`,
          err
        );
        this.metrics.errors++;
      }
    });
  }

  public async getUserSockets(userId: string): Promise<ISocket[]> {
    if (!this.io) return [];

    try {
      const socketIds =
        ((await this.safeRedisCommand((client) =>
          client.smembers(this.getkey(userId))
        )) as string[]) || [];

      const activeSockets: ISocket[] = [];
      const cleanupIds: string[] = [];

      // Check each socket ID
      for (const id of socketIds) {
        try {
          const socket = this.io.sockets.sockets.get(id) as ISocket;
          if (socket && socket.connected) {
            activeSockets.push(socket);
          } else {
            cleanupIds.push(id);
          }
        } catch (err) {
          cleanupIds.push(id);
          logger.error(`Error checking socket ${id}:`, err);
        }
      }

      // Cleanup stale IDs asynchronously
      if (cleanupIds.length > 0) {
        this.safeRedisCommand((client) =>
          client.srem(this.getkey(userId), cleanupIds)
        ).catch((err) => {
          logger.error("Failed to cleanup stale socket IDs:", err);
        });
      }

      return activeSockets;
    } catch (err) {
      logger.error("Failed to get user sockets from Redis:", err);
      return [];
    }
  }

  public async emitToUser(userId: string, event: string, data: any) {
    const sockets = await this.getUserSockets(userId);
    sockets.forEach((socket) => {
      try {
        socket.emit(event, data);
      } catch (err) {
        logger.error(`Failed to emit to socket ${socket.id}:`, err);
        this.metrics.errors++;
      }
    });
  }

  public broadcastToRoom(room?: string, event?: string, data: any = null) {
    try {
      if (!room || !event) return;
      this.io.to(room).emit(event, data);
    } catch (err) {
      logger.error(`Failed to broadcast to room ${room}:`, err);
      this.metrics.errors++;
    }
  }

  /**
   * Get current metrics
   */
  public getMetrics() {
    return {
      ...this.metrics,
      currentConnections: this.io?.engine?.clientsCount || 0,
    };
  }

  /**
   * Get all active socket IDs for a user
   */
  public async getActiveSocketIds(userId: string): Promise<string[]> {
    const sockets = await this.getUserSockets(userId);
    return sockets.map((s) => s.id);
  }

  /**
   * Force disconnect all sockets for a user
   */
  public async disconnectUser(userId: string, reason = "admin request") {
    const sockets = await this.getUserSockets(userId);
    sockets.forEach((socket) => {
      socket.disconnect(true);
      logger.info(`Disconnected socket ${socket.id} for user ${userId}`, {
        reason,
      });
    });
  }
  public async disconnect() {
    try {
      logger.info("Closing Socket connection: " + toUTC(new Date()));
      await this.io.close();
      this.io.disconnectSockets(true);
      clearInterval(this._monitoringInterval);
    } catch (error) {
      logger.error("Error on closing Socket connection: " + toUTC(new Date()));
    }
  }
}

// export default RedisSocket;
export default new RedisSocket();
