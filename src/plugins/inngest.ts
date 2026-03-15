import { functions, inngest } from "@/app_inngest";
import { APP_CONFIG } from "@/config/app.config";
import fp from "fastify-plugin";
import { LogLevel } from "inngest";
import fastifyPlugin from "inngest/fastify";

export default fp(async (fastify) => {
  // register the official plugin
  await fastify.register(fastifyPlugin, {
    client: inngest,
    functions: functions,
    logLevel: APP_CONFIG.INNGEST_LOG_LEVEL as LogLevel,
  });
  fastify.decorate("inngest", inngest);
});
