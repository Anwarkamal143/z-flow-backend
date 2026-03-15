import credentialController from "@/controllers/credential.controller";
import authMiddleware from "@/middlewares/auth.middleware";
import polarMiddleware from "@/middlewares/polar.middleware";
import { CredentialPaginationConfig } from "@/services/credentails.service";
import { FastifyInstance } from "fastify";

export default async function credentialRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", authMiddleware.isAuthenticated);
  fastify.addHook("preHandler", polarMiddleware.premiumSubscription);

  // POST / → create workflow
  fastify.post("/", credentialController.create);
  // GET / → get
  fastify.get<{ Querystring: CredentialPaginationConfig }>(
    "/",
    credentialController.getAll,
  );
  fastify.get("/type", credentialController.getByType);

  fastify.get("/:id", credentialController.getById);

  fastify.delete("/:id", credentialController.deleteById);
  fastify.put("/:id", credentialController.update);
}
