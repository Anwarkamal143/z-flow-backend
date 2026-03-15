import redisClient from "@/config/redis";
import redisSocket from "@/config/socket";
import type { FastifyInstance } from "fastify";

async function shutdownServices() {
  await redisSocket.disconnect();
  await redisClient.disconnect();
}

function gracefulShutdown(fastify: FastifyInstance) {
  const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM", "SIGQUIT"];

  for (const signal of signals) {
    process.on(signal, async () => {
      fastify.log.info(`🛑 Received ${signal} - shutting down gracefully...`);

      try {
        await shutdownServices();
        await fastify.close(); // closes routes, plugins, http server

        fastify.log.info("✅ Fastify closed. Exiting now.");
        process.exit(0);
      } catch (err: any) {
        fastify.log.error("❌ Error during shutdown:", err);
        process.exit(1);
      }
    });
  }
}

function handleUncaughtErrors(fastify: FastifyInstance) {
  process.on("uncaughtException", (err) => {
    fastify.log.error("❌ Uncaught Exception:" + err);
    process.exit(1); // Exit to avoid unknown state
  });

  process.on("unhandledRejection", (reason, promise) => {
    fastify.log.error("❌ Unhandled Rejection at:" + reason);
    process.exit(1); // Exit to avoid unknown state
  });
}

export function setupShutdownHandlers(fastify: FastifyInstance) {
  gracefulShutdown(fastify);
  handleUncaughtErrors(fastify);
}
