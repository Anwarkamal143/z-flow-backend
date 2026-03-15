import socialAuthController from "@/controllers/social-auth.controller";
import authMiddleware from "@/middlewares/auth.middleware";
import { FastifyInstance } from "fastify";

export default async function socialRoutes(fastify: FastifyInstance) {
  fastify.get("/callback", socialAuthController.googleAuthCallback);
  fastify.get(
    "/",
    { preHandler: authMiddleware.redirectIfLoggedIn },
    socialAuthController.googleSignAuth
  );
}
