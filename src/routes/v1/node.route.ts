import nodeController from "@/controllers/node.controller";
import authMiddleware from "@/middlewares/auth.middleware";
import polarMiddleware from "@/middlewares/polar.middleware";
import { FastifyInstance } from "fastify";

export default async function nodeRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", authMiddleware.isAuthenticated);
  fastify.addHook("preHandler", polarMiddleware.premiumSubscription);

  fastify.post("/", nodeController.create);
  fastify.put("/:id", nodeController.updateNode);
  fastify.get("/:id", nodeController.getById);
  fastify.delete("/:id", nodeController.deleteById);
  fastify.delete(
    "/workflow/:workflowId",
    nodeController.deleteByNodeIdsWorkflowId,
  );
}
