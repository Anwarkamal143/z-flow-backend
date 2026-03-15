import { Webhooks } from "@polar-sh/fastify";
import { FastifyInstance } from "fastify";

export default async function webHooksRoutes(app: FastifyInstance) {
  // 🔹 Webhooks (Subscription events, payment events)
  app.post(
    "/",
    Webhooks({
      webhookSecret: process.env.POLAR_WEBHOOK_SECRET!,
      /**
       * Payload contains all events:
       * - subscription.created
       * - subscription.updated
       * - checkout.paid
       */
      onPayload: async (payload) => {
        console.log("Received Polar event: ", payload.type);

        switch (payload.type) {
          case "subscription.created":
            // Save to DB
            break;

          // case "checkout.paid":
          //   // Activate paid feature
          //   break;

          case "subscription.canceled":
            // Revoke premium access
            break;
        }
      },
    })
  );
}
