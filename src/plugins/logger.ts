import type { FastifyInstance } from "fastify";
import pino from "pino";

export default function registerLogger(fastify: FastifyInstance) {
  const logger = pino({
    level: process.env.NODE_ENV === "production" ? "info" : "debug",
  });
  fastify.decorate("logger", logger);
}
