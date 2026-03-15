import testController from "@/controllers/test.controller";
import { FastifyInstance } from "fastify";

export default async function testRoutes(fastify: FastifyInstance) {
  fastify.post("/encrypt", testController.testPoint);
  fastify.get("/decrypt", testController.testPoint2);
}
