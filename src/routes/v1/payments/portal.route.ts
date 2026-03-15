import { APP_CONFIG, ENVIRONMENTS } from "@/config/app.config";
import polarMiddleware from "@/middlewares/polar.middleware";
import { BadRequestException } from "@/utils/catch-errors";
import { CustomerPortal } from "@polar-sh/fastify";
import { FastifyInstance } from "fastify";

export default async function portalRoutes(app: FastifyInstance) {
  // 🔹 Checkout: Returns a URL to redirect the user

  // 🔹 Customer billing portal
  app.get(
    "/",
    { preHandler: polarMiddleware.checkAndCreatePolarCustomer },
    CustomerPortal({
      accessToken: APP_CONFIG.POLAR_ACCESS_TOKEN!,
      returnUrl: APP_CONFIG.APP_URL || "https://myapp.com",
      server: !ENVIRONMENTS.isProduction ? "sandbox" : "production",

      /**
       * IMPORTANT: Resolve the Polar Customer ID
       * Converts your (Auth user) -> (Polar Customer)
       */
      getCustomerId: async (request) => {
        const customer = request.customer; // if using JWT / Clerk / custom auth
        // Example:
        // return user.polarCustomerId;
        if (!customer.id) {
          throw new BadRequestException("Customer not found");
        }
        return customer.id; // Return valid Polar customer ID here
      },
    })
  );
}
