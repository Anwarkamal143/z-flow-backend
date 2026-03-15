import { FastifyInstance } from "fastify";
import googleFormWebhooksRoutes from "./google-form";
import stripeWebhooksRoutes from "./stripe-events";

export default async function webHooksRoutes(fastify: FastifyInstance) {
  // POST /webhooks/google-form → current user

  fastify.register(googleFormWebhooksRoutes);
  fastify.register(stripeWebhooksRoutes);

  // healthcheck

  // simple ready check
}
