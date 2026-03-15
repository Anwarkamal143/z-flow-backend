import executionController from "@/controllers/execution.controller";
import authMiddleware from "@/middlewares/auth.middleware";
import polarMiddleware from "@/middlewares/polar.middleware";
import { FastifyInstance } from "fastify";

export default async function executionsRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", authMiddleware.isAuthenticated);
  fastify.addHook("preHandler", polarMiddleware.premiumSubscription);

  fastify.get("/", executionController.list);
  fastify.post("/", executionController.create);
  fastify.get("/:id", executionController.getById);
}
