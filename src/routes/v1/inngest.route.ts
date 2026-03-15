import inngestController from "@/controllers/inngest.controller";
import { FastifyInstance } from "fastify";

export default async function inngestRoutes(fastify: FastifyInstance) {
  fastify.get("/test-inngest", inngestController.sendDemo);
}
