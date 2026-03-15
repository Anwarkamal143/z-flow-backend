import { db } from "@/db";
import fp from "fastify-plugin";

export default fp(async (fastify) => {
  fastify.decorate("db", db);
  fastify.addHook("onClose", async () => {
    await db.$client.end();
  });
});
