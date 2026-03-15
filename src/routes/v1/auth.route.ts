import authController from "@/controllers/auth.controller";
import authMiddleware from "@/middlewares/auth.middleware";
import { IRegisterUser } from "@/schema/auth";
import { FastifyInstance } from "fastify";

export default async function authRoutes(fastify: FastifyInstance) {
  fastify.post("/sign-out", authController.signOut);
  fastify.post<{ Body: IRegisterUser }>(
    "/register",
    { preHandler: authMiddleware.redirectIfLoggedIn },
    authController.signUp
  );
  fastify.post<{ Body: { email: string; password: string } }>(
    "/login",
    { preHandler: authMiddleware.redirectIfLoggedIn },
    authController.login
  );
  fastify.get("/refresh-tokens", authController.refreshTokens);
}
