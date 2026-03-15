import customerController from "@/controllers/payments/customer.controller";
import polarMiddleware from "@/middlewares/polar.middleware";
import { FastifyInstance } from "fastify";

export default async function customerRoutes(app: FastifyInstance) {
  // Subscription-specific routes can be added here

  // Example: GET /subscriptions → list user subscriptions
  app.get(
    "/state",
    { preHandler: polarMiddleware.premiumSubscription },
    customerController.getPolarCustomer
  );
}
