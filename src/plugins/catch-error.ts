import AppError from "@/utils/app-error";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";

export default fp(async (app: FastifyInstance) => {
  app.setErrorHandler(
    (error: any, _request: FastifyRequest, reply: FastifyReply) => {
      // Log the full error
      app.log.error(error);
      if (error instanceof AppError) {
        // Structured response for custom AppError
        return reply.status(error.statusCode).send({
          success: false,
          message: error.message,
          errorCode: error.errorCode,
          metadata: error.metadata || null,
          timestamp: error.timestamp.toISOString(),
          category: error.category,
          isOperational: error.isOperational,
          ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
        });
      }

      // Fallback for unknown errors
      const unknownError = AppError.fromError(error as Error);
      return reply.status(unknownError.statusCode).send({
        success: false,
        message: unknownError.message,
        errorCode: unknownError.errorCode,
        metadata: unknownError.metadata || null,
        timestamp: unknownError.timestamp.toISOString(),
        category: unknownError.category,
        isOperational: unknownError.isOperational,
        ...(process.env.NODE_ENV === "development" && {
          stack: unknownError.stack,
        }),
      });
    }
  );
});
