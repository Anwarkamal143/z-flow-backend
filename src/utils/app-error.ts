import { HTTPSTATUS, HttpStatusCode } from "@/config/http.config";
import { ErrorCode } from "@/enums/error-code.enum";

type ErrorCategory =
  | "operational"
  | "programming"
  | "security"
  | "infrastructure";
export type ErrorMetadata = Record<string, unknown> & {
  context?: Record<string, unknown> | undefined;
  originalError?: Error;
  isRetryable?: boolean;
};

export default class AppError extends Error {
  // public readonly status: string;
  public readonly isOperational: boolean;
  public readonly category: ErrorCategory;
  public readonly timestamp: Date;
  public readonly metadata: ErrorMetadata;
  public readonly errorCode: ErrorCode;
  public readonly cause?: Error;

  constructor(
    public readonly message: string,
    public readonly statusCode: HttpStatusCode = HTTPSTATUS.INTERNAL_SERVER_ERROR,
    errorCode: ErrorCode = ErrorCode.INTERNAL_SERVER_ERROR,
    options: {
      isOperational?: boolean;
      category?: ErrorCategory | undefined;
      metadata?: ErrorMetadata | undefined;
      cause?: Error | undefined;
    } = {}
  ) {
    super(message);

    // Standard properties
    this.statusCode = statusCode;
    // this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.errorCode = errorCode;
    this.timestamp = new Date();
    this.cause = options.cause as any;

    // Configuration options
    this.isOperational = options.isOperational ?? true;
    this.category = options.category ?? this.determineErrorCategory();
    this.metadata = options.metadata || {};

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }

    // Set prototype explicitly for instanceof checks
    Object.setPrototypeOf(this, AppError.prototype);
  }

  private determineErrorCategory(): ErrorCategory {
    if (this.statusCode >= 500) {
      return "infrastructure";
    }

    if (
      [
        ErrorCode.AUTH_UNAUTHORIZED,
        ErrorCode.AUTH_INVALID_TOKEN,
        ErrorCode.ACCESS_UNAUTHORIZED,
      ].includes(this.errorCode)
    ) {
      return "security";
    }

    return "operational";
  }

  public toJSON() {
    return {
      // status: this.status,
      statusCode: this.statusCode,
      errorCode: this.errorCode,
      message: this.message,
      ...(this.metadata?.context && { context: this.metadata.context }),
      ...(this.cause && { cause: this.cause.message }),
      timestamp: this.timestamp.toISOString(),
      category: this.category,
      isOperational: this.isOperational,
      ...(process.env.NODE_ENV === "development" && {
        stack: this.stack,
        fullError: this.metadata?.originalError,
      }),
    };
  }

  public static fromError(error: Error, statusCode?: HttpStatusCode): AppError {
    if (error instanceof AppError) return error;

    return new AppError(
      error.message,
      statusCode || HTTPSTATUS.INTERNAL_SERVER_ERROR,
      ErrorCode.INTERNAL_SERVER_ERROR,
      {
        isOperational: false,
        category: "programming",
        metadata: {
          originalError: error,
        },
        cause: error,
      }
    );
  }

  public static createValidationError(
    message: string,
    errors: Record<string, string[]>,
    context?: Record<string, unknown>
  ): AppError {
    return new AppError(
      message,
      HTTPSTATUS.UNPROCESSABLE_ENTITY,
      ErrorCode.VALIDATION_ERROR,
      {
        metadata: {
          context,
          validationErrors: errors,
        },
      }
    );
  }

  // public static createStripeError(
  //   stripeError: Stripe.StripeRawError,
  //   context?: Record<string, unknown>
  // ): AppError {
  //   const statusCode = getHttpStatusForStripeError(stripeError);
  //   const errorCode = mapStripeErrorToCode(
  //     stripeError.type as StripeErrorType,
  //     stripeError.decline_code
  //   );

  //   return new AppError(stripeError.message as string, statusCode, errorCode, {
  //     metadata: {
  //       context,
  //       declineCode: stripeError.decline_code,
  //       stripeErrorType: stripeError.type,
  //       originalError: stripeError as any,
  //     },
  //     isOperational: true,
  //     category: "operational",
  //   });
  // }
}

// Helper functions for Stripe errors (would be imported from your error mapping utilities)
// function getHttpStatusForStripeError(
//   error: Stripe.StripeRawError
// ): HttpStatusCode {
//   const statusMap: Record<string, HttpStatusCode> = {
//     StripeCardError: HTTPSTATUS.PAYMENT_REQUIRED,
//     StripeRateLimitError: HTTPSTATUS.TOO_MANY_REQUESTS,
//     StripeInvalidRequestError: HTTPSTATUS.BAD_REQUEST,
//     StripeAPIError: HTTPSTATUS.INTERNAL_SERVER_ERROR,
//     StripeConnectionError: HTTPSTATUS.SERVICE_UNAVAILABLE,
//     StripeAuthenticationError: HTTPSTATUS.UNAUTHORIZED,
//   };

//   return statusMap[error.type] || HTTPSTATUS.INTERNAL_SERVER_ERROR;
// }
