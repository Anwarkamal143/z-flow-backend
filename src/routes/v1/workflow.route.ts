import worklowController from "@/controllers/worklow.controller";
import authMiddleware from "@/middlewares/auth.middleware";
import polarMiddleware from "@/middlewares/polar.middleware";
import { WorkflowPaginationConfig } from "@/services/workflow.service";
import { FastifyInstance } from "fastify";

export default async function workflowRoutes(fastify: FastifyInstance) {
  // Optional: apply middleware to all routes in this module
  fastify.post("/google-form", worklowController.executeWorkflow);
  fastify.addHook("preHandler", authMiddleware.isAuthenticated);
  fastify.addHook("preHandler", polarMiddleware.premiumSubscription);

  // POST / → create workflow
  fastify.post("/", worklowController.create);
  // GET / → get
  fastify.get<{ Querystring: WorkflowPaginationConfig }>(
    "/",
    worklowController.getAll,
  );
  fastify.delete("/", worklowController.deleteAll);

  fastify.get("/:id", worklowController.getById);

  fastify.delete("/:id", worklowController.deleteById);
  fastify.put("/name/:id", worklowController.updateName);
  fastify.put("/:id", worklowController.updateWorkflow);
  fastify.post("/execute", worklowController.executeWorkflow);
}
