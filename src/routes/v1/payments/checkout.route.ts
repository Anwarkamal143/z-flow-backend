import checkoutController from "@/controllers/payments/checkout.controller";
import polarMiddleware from "@/middlewares/polar.middleware";
import { FastifyInstance } from "fastify";

export default async function checkoutRoutes(app: FastifyInstance) {
  // 🔹 Checkout: Returns a URL to redirect the user
  app.get<{ Querystring: { products: string } }>(
    "/",
    {
      preHandler: polarMiddleware.checkAndCreatePolarCustomer,
    },
    checkoutController.getCustomerCheckout
    // Checkout({
    //   accessToken: process.env.POLAR_ACCESS_TOKEN!, // REQUIRED
    //   successUrl: APP_CONFIG.APP_URL!, // user redirected after payment
    //   returnUrl: APP_CONFIG.APP_URL!,
    //   server: !ENVIRONMENTS.isProduction ? "sandbox" : "production", // sandbox or production
    //   theme: "dark", // or "light"
    // })
  );
  app.get<{ Querystring: { products: string } }>(
    "/pro",
    {
      preHandler: polarMiddleware.checkAndCreatePolarCustomer,
    },
    checkoutController.getProSubscriptionCheckout
    // Checkout({
    //   accessToken: process.env.POLAR_ACCESS_TOKEN!, // REQUIRED
    //   successUrl: APP_CONFIG.APP_URL!, // user redirected after payment
    //   returnUrl: APP_CONFIG.APP_URL!,
    //   server: !ENVIRONMENTS.isProduction ? "sandbox" : "production", // sandbox or production
    //   theme: "dark", // or "light"
    // })
  );
}
