import fp from "fastify-plugin";

import redisClient from "@/config/redis";
import type { FastifyPluginAsync } from "fastify";

const redisPlugin: FastifyPluginAsync = async (fastify) => {
  // await redisClient.connect();

  fastify.decorate("redis", redisClient);

  fastify.addHook("onClose", async (fastifyInstance) => {
    fastifyInstance.log.info("Disconnecting Redis...");
    await redisClient?.disconnect();
  });
};

export default fp(redisPlugin);
