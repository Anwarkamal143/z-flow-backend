import { APP_CONFIG } from "@/config/app.config";
import { HTTPSTATUS } from "@/config/http.config";
import { ErrorCode } from "@/enums/error-code.enum";
import { removeVersionFromBasePath } from "@/utils";
import AppError from "@/utils/app-error";
import { SuccessResponse } from "@/utils/requestResponse";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import authRoutes from "./v1/auth.route";
import credentialRoutes from "./v1/credential.route";
import inngestRoutes from "./v1/inngest.route";
import nodeRoutes from "./v1/node.route";
import paymentRoutes from "./v1/payments";
import socialRoutes from "./v1/social.route";
import testRoutes from "./v1/test.route";
import userRoutes from "./v1/user.route";
import webHooksRoutes from "./v1/webhooks";
import workflowRoutes from "./v1/workflow.route";
import executionsRoutes from "./v1/executions";

async function v1RoutesV1(fastify: FastifyInstance) {
  // Health check
  fastify.get("/health", async () => ({
    status: "ok",
    uptime: process.uptime(),
  }));
  // Mount versioned API routes under base path
  fastify.register(
    async (instance) => {
      instance.register(authRoutes, { prefix: "/auth" });
      instance.register(userRoutes, { prefix: "/user" });
      instance.register(socialRoutes, { prefix: "/google" });
      instance.register(inngestRoutes, { prefix: "/inngest" });
      instance.register(paymentRoutes, { prefix: "/payments" });
      instance.register(workflowRoutes, { prefix: "/workflows" });
      instance.register(executionsRoutes, { prefix: "/executions" });
      instance.register(nodeRoutes, { prefix: "/nodes" });
      instance.register(credentialRoutes, { prefix: "/creds" });
      // webhooks
      // healthcheck

      // simple ready check
      instance.get("/ready", async (_request, reply) => {
        try {
          return SuccessResponse(reply, {
            message: "server is running",
            data: { ready: true },
          });
        } catch (err) {
          return SuccessResponse(reply, {
            message: "server is not running",
            data: { ready: false },
            statusCode: HTTPSTATUS.SERVICE_UNAVAILABLE,
            errorCode: ErrorCode.SERVICE_UNAVAILABLE,
          });
        }
      });
    },
    { prefix: APP_CONFIG.BASE_API_PATH },
  );
  fastify.register(
    async (instance) => {
      instance.register(webHooksRoutes, { prefix: "/webhooks" });
      // Optional: Mount Google callback routes outside base path
      instance.register(socialRoutes, { prefix: "/google" });
    },
    { prefix: removeVersionFromBasePath(APP_CONFIG.BASE_API_PATH) },
  );
  fastify.register(testRoutes, { prefix: "/test" });
  // Catch-all for undefined routes
  fastify.setNotFoundHandler((_req: FastifyRequest, _rep: FastifyReply) => {
    throw new AppError(`Can't find ${_req.url} on this server!`, 404);
  });
}

export default async function v1Routes(fastify: FastifyInstance) {
  await v1RoutesV1(fastify);
}
