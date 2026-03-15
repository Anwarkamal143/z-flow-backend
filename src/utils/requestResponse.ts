import { HTTPSTATUS, HttpStatusCode } from "@/config/http.config";
import { ErrorCode } from "@/enums/error-code.enum";
import { FastifyReply, FastifyRequest } from "fastify";
import AppError from "./app-error";
import { hashValue } from "./bcrypt";
import { toUTC } from "./date-time";

interface SuccessResponseProps {
  message: string;
  data?: unknown;
  success?: boolean;
  statusCode?: HttpStatusCode;
  status?: "success" | "fail" | "error";
  errorCode?: ErrorCode;
  [key: string]: unknown;
}

interface ErrorResponseOptions {
  errorCode?: ErrorCode;
  metadata?: Record<string, unknown>;
  isOperational?: boolean;
  cause?: Error;
}

interface FingerprintOptions {
  includeHeaders?: string[];
  saltRounds?: number;
}

export class ResponseUtils {
  /**
   * Standard success response formatter (Fastify version)
   */
  static success(
    reply: FastifyReply,
    props: SuccessResponseProps,
    request?: FastifyRequest
  ) {
    const {
      message = "",
      data,
      success = true,
      statusCode = HTTPSTATUS.OK,
      status = "success",
      ...rest
    } = props;

    // Logging (optional)
    if (request) {
      const userId = (request as any).user?.id || "Guest";
      request.log.info(
        `[${new Date().toISOString()}] [${request.method}] ${
          request.url
        } - ${statusCode} - User: ${userId}`
      );
    }

    return reply.status(statusCode).send({
      message,
      success,
      data,
      status,
      timestamp: toUTC(new Date()),
      ...rest,
    });
  }

  /**
   * Standard error response creator for Fastify
   */
  static error(
    message: string,
    statusCode: HttpStatusCode,
    options?: ErrorResponseOptions,
    request?: FastifyRequest
  ): AppError {
    const error = new AppError(
      message,
      statusCode,
      options?.errorCode || ErrorCode.INTERNAL_SERVER_ERROR,
      {
        metadata: options?.metadata,
        isOperational: options?.isOperational ?? true,
        cause: options?.cause,
      }
    );

    if (request) {
      const userId = (request as any).user?.id || "Guest";
      request.log.error(
        `[${new Date().toISOString()}] [${request.method}] ${
          request.url
        } - ${statusCode} - User: ${userId}`
      );
    }

    return error;
  }

  /**
   * Generates a fingerprint hash for request identification (Fastify version)
   */
  static async getFingerprint(
    request: FastifyRequest,
    options: FingerprintOptions = {}
  ): Promise<string | null> {
    const headersToInclude = options.includeHeaders || ["user-agent"];

    const headerValues = headersToInclude
      .map((header) => request.headers[header.toLowerCase()] || "")
      .join("-");

    const fingerprintString = `${request.ip}-${headerValues}`;
    return hashValue(fingerprintString, options.saltRounds);
  }

  /**
   * Empty success response for no-return operations
   */
  static noContent(reply: FastifyReply, message = "Operation successful") {
    return reply.status(HTTPSTATUS.NO_CONTENT).send({
      message,
      success: true,
      status: "success",
      timestamp: toUTC(new Date()),
    });
  }
}

// Legacy-compatible exports
export const SuccessResponse = ResponseUtils.success;
export const ErrorResponse = ResponseUtils.error;
export const APIResponse = ResponseUtils.success;
export const getFingerPrint = ResponseUtils.getFingerprint;
export const NoContentResponse = ResponseUtils.noContent;
