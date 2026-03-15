import { APP_CONFIG, ENVIRONMENTS } from "@/config/app.config";
import cookieParser from "@fastify/cookie";
import cors from "@fastify/cors";
import fastifyFormbody from "@fastify/formbody";
import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";
import drizzlePlugin from "./plugins/drizzle-plugin";
import redisPlugin from "./plugins/redis";
import socketPlugin from "./plugins/socket";

import qs from "qs";
import { HTTPSTATUS } from "./config/http.config";
import { logger } from "./config/logger";
import { ErrorCode } from "./enums/error-code.enum";
import errorPlugin from "./plugins/catch-error";
import inngest from "./plugins/inngest";
import registerLogger from "./plugins/logger";
import v1Routes from "./routes";
import AppError from "./utils/app-error";
const CORS_OPTIONS = {
  origin: (origin, callback) => {
    if (
      !ENVIRONMENTS.isProduction ||
      !origin ||
      APP_CONFIG.WHITELIST_ORIGINS.includes(origin)
    ) {
      callback(null, true);
    } else {
      const err = new AppError(
        `CORS error ${origin} is not allowed by CORS`,
        HTTPSTATUS.UNAUTHORIZED,
        { errorCode: ErrorCode.CORS_ERROR } as any,
      );
      logger.warn(`CORS error ${origin} is not allowed by CORS`);
      callback(err, false);
    }
  },
  credentials: true,
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
};
export function buildApp() {
  const fastify = Fastify({
    querystringParser: (str) =>
      qs.parse(str, {
        allowDots: true,
        arrayLimit: 100,
        depth: 10,
      }),
    logger: {
      level: process.env.NODE_ENV === "production" ? "info" : "debug",
      ...(!ENVIRONMENTS.isProduction
        ? {
            transport: {
              target: "pino-pretty",
              options: {
                colorize: true,
                translateTime: "SYS:standard",
                ignore: "pid,hostname",
              },
            },
          }
        : {}),
    },
    trustProxy: true,
  });
  // register plugins
  fastify.register(cors, CORS_OPTIONS);
  fastify.register(rateLimit, {
    max: 100,
    timeWindow: "2 minute",
  });
  fastify.register(fastifyFormbody);
  fastify.register(errorPlugin);
  fastify.register(cookieParser);
  fastify.register(registerLogger);
  fastify.register(drizzlePlugin);
  fastify.register(redisPlugin);
  fastify.register(socketPlugin);
  fastify.register(inngest);

  // routes
  fastify.register(v1Routes);

  return fastify;
}
