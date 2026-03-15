import authMiddleware from "@/middlewares/auth.middleware";
import { FastifyInstance } from "fastify";
import checkoutRoutes from "./checkout.route";
import customerRoutes from "./customer.route";
import portalRoutes from "./portal.route";
import webHooksRoutes from "./webhooks.route";

async function paymentRoutes(fastify: FastifyInstance) {
  // Optional: Mount Google callback routes outside base path
  fastify.addHook("preHandler", authMiddleware.isAuthenticated);
  fastify.register(checkoutRoutes, { prefix: "/checkout" });
  fastify.register(portalRoutes, { prefix: "/portal" });
  fastify.register(webHooksRoutes, { prefix: "/webhooks" });
  fastify.register(customerRoutes, { prefix: "/customer" });
}

export default async function paymentsRoutes(fastify: FastifyInstance) {
  await paymentRoutes(fastify);
}
