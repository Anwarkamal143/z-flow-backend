// plugins/socket.ts
import { logger } from "@/config/logger";
import redisSocket from "@/config/socket";
import fp from "fastify-plugin";

export default fp(async (fastify) => {
  // if (redisClient.isConnected) {
  fastify.decorate("socket", redisSocket);

  fastify.addHook("onReady", async () => {
    const httpServer = fastify.server;
    logger.info("Connecting Socket");
    redisSocket.connect(httpServer);
  });

  fastify.addHook("onClose", async () => {
    await redisSocket.disconnect();
  });
  // }
});
