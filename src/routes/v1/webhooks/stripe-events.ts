import webhooksController from "@/controllers/webhooks.controller";
import { FastifyInstance } from "fastify";

export default async function stripeWebhooksRoutes(fastify: FastifyInstance) {
  // POST /webhooks/google-form → current user
  fastify.post("/stripe-events", webhooksController.stripeEvent);
}
