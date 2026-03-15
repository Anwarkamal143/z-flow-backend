import userController from "@/controllers/user.controller";
import authMiddleware from "@/middlewares/auth.middleware";
import { UsersPaginationConfig } from "@/services/user.service";
import { FastifyInstance } from "fastify";

export default async function userRoutes(fastify: FastifyInstance) {
  // Optional: apply middleware to all routes in this module
  fastify.addHook("preHandler", authMiddleware.loggedInUser);

  // GET /user/me → current user
  fastify.get("/me", userController.me);

  // GET /user → findAll
  fastify.get<{ Querystring: UsersPaginationConfig }>(
    "/",
    { preHandler: authMiddleware.isAuthenticated },
    userController.findAll
  );

  // GET /user/:userId → findById
  fastify.get<{ Params: { userId: string } }>(
    "/:userId",
    { preHandler: authMiddleware.isAuthenticated },
    userController.findById
  );
}
