import { HTTPSTATUS, HttpStatusCode } from "@/config/http.config";
import { ErrorCode } from "@/enums/error-code.enum";
import AppError, { ErrorMetadata } from "./app-error";

type ExceptionOptions = {
  errorCode?: ErrorCode;
  metadata?: ErrorMetadata;
  cause?: Error;
};

export class NotFoundException extends AppError {
  constructor(message = "Resource not found", options: ExceptionOptions = {}) {
    super(
      message,
      HTTPSTATUS.NOT_FOUND,
      options.errorCode || ErrorCode.RESOURCE_NOT_FOUND,
      {
        metadata: options?.metadata,
        cause: options?.cause,
      }
    );
  }
}

export class BadRequestException extends AppError {
  constructor(
    message = "Invalid request data",
    options: ExceptionOptions = {}
  ) {
    super(
      message,
      HTTPSTATUS.BAD_REQUEST,
      options.errorCode || ErrorCode.BAD_REQUEST,
      {
        metadata: options.metadata,
        cause: options.cause,
      }
    );
  }
}

export class UnauthorizedException extends AppError {
  constructor(message = "Unauthorized access", options: ExceptionOptions = {}) {
    super(
      message,
      HTTPSTATUS.FORBIDDEN,
      options.errorCode || ErrorCode.ACCESS_UNAUTHORIZED,
      {
        metadata: options.metadata,
        cause: options.cause,
      }
    );
  }
}
export class UnauthenticatedException extends AppError {
  constructor(message = "Not authenticated", options: ExceptionOptions = {}) {
    super(
      message,
      HTTPSTATUS.UNAUTHORIZED,
      options.errorCode || ErrorCode.AUTH_UNAUTHORIZED,
      {
        metadata: options.metadata,
        cause: options.cause,
      }
    );
  }
}

export class ForbiddenException extends AppError {
  constructor(message = "Forbidden resource", options: ExceptionOptions = {}) {
    super(
      message,
      HTTPSTATUS.FORBIDDEN,
      options.errorCode || ErrorCode.ACCESS_UNAUTHORIZED,
      {
        metadata: options.metadata,
        cause: options.cause,
      }
    );
  }
}

export class ConflictException extends AppError {
  constructor(message = "Resource conflict", options: ExceptionOptions = {}) {
    super(
      message,
      HTTPSTATUS.CONFLICT,
      options.errorCode || ErrorCode.DATA_CONFLICT,
      {
        metadata: options.metadata,
        cause: options.cause,
      }
    );
  }
}

export class InternalServerException extends AppError {
  constructor(
    message = "Internal server error",
    options: ExceptionOptions = {}
  ) {
    super(
      message,
      HTTPSTATUS.INTERNAL_SERVER_ERROR,
      options.errorCode || ErrorCode.INTERNAL_SERVER_ERROR,
      {
        metadata: options.metadata,
        cause: options.cause,
        isOperational: false,
      }
    );
  }
}

export class ValidationException extends AppError {
  constructor(
    message = "Validation failed",
    public readonly errors:
      | Record<string, string[]>
      | {
          path: string;
          message: string;
        }[],
    options: Omit<ExceptionOptions, "errorCode"> = {}
  ) {
    super(
      message,
      HTTPSTATUS.UNPROCESSABLE_ENTITY,
      ErrorCode.VALIDATION_ERROR,
      {
        metadata: {
          ...options.metadata,
          validationErrors: errors,
        },
        cause: options.cause,
      }
    );
  }
}

export class PaymentRequiredException extends AppError {
  constructor(message = "Payment required", options: ExceptionOptions = {}) {
    super(
      message,
      HTTPSTATUS.PAYMENT_REQUIRED,
      options.errorCode || ErrorCode.PAYMENT_REQUIRED,
      {
        metadata: options.metadata,
        cause: options.cause,
      }
    );
  }
}

export class TooManyRequestsException extends AppError {
  constructor(message = "Too many requests", options: ExceptionOptions = {}) {
    super(
      message,
      HTTPSTATUS.TOO_MANY_REQUESTS,
      options.errorCode || ErrorCode.TOO_MANY_REQUESTS,
      {
        metadata: {
          ...options.metadata,
          retryAfter: "60s",
        },
        cause: options.cause,
      }
    );
  }
}

export class HttpException extends AppError {
  constructor(
    message: string,
    statusCode: HttpStatusCode,
    options: ExceptionOptions = {}
  ) {
    super(
      message,
      statusCode,
      options.errorCode || getDefaultErrorCode(statusCode),
      {
        metadata: options.metadata,
        cause: options.cause,
      }
    );
  }
}
function getDefaultErrorCode(statusCode: HttpStatusCode): ErrorCode {
  const mapping: Partial<Record<HttpStatusCode, ErrorCode>> = {
    [HTTPSTATUS.BAD_REQUEST]: ErrorCode.BAD_REQUEST,
    [HTTPSTATUS.FORBIDDEN]: ErrorCode.ACCESS_UNAUTHORIZED,
    [HTTPSTATUS.UNAUTHORIZED]: ErrorCode.AUTH_UNAUTHORIZED,
    [HTTPSTATUS.NOT_FOUND]: ErrorCode.RESOURCE_NOT_FOUND,
    [HTTPSTATUS.CONFLICT]: ErrorCode.DATA_CONFLICT,
    [HTTPSTATUS.UNPROCESSABLE_ENTITY]: ErrorCode.VALIDATION_ERROR,
    [HTTPSTATUS.TOO_MANY_REQUESTS]: ErrorCode.TOO_MANY_REQUESTS,
    [HTTPSTATUS.INTERNAL_SERVER_ERROR]: ErrorCode.INTERNAL_SERVER_ERROR,
    [HTTPSTATUS.SERVICE_UNAVAILABLE]: ErrorCode.SERVICE_UNAVAILABLE,
    [HTTPSTATUS.PAYMENT_REQUIRED]: ErrorCode.PAYMENT_REQUIRED,
  };

  return mapping[statusCode] || ErrorCode.INTERNAL_SERVER_ERROR;
}
