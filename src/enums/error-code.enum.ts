/**
 * Comprehensive error codes for the application
 * Organized by category with clear naming conventions
 */
const enum ErrorCode {
  // ======================
  // Authentication Errors
  // ======================
  AUTH_EMAIL_ALREADY_EXISTS = "AUTH_EMAIL_ALREADY_EXISTS",
  AUTH_INVALID_CREDENTIALS = "AUTH_INVALID_CREDENTIALS",
  AUTH_INVALID_TOKEN = "AUTH_INVALID_TOKEN",
  AUTH_EXPIRED_TOKEN = "AUTH_EXPIRED_TOKEN",
  AUTH_USER_NOT_FOUND = "AUTH_USER_NOT_FOUND",
  AUTH_ACCOUNT_NOT_FOUND = "AUTH_ACCOUNT_NOT_FOUND",
  AUTH_TOO_MANY_ATTEMPTS = "AUTH_TOO_MANY_ATTEMPTS",
  AUTH_UNAUTHORIZED = "AUTH_UNAUTHORIZED",
  AUTH_TOKEN_NOT_FOUND = "AUTH_TOKEN_NOT_FOUND",
  AUTH_TOKEN_REUSED = "AUTH_TOKEN_REUSED",
  AUTH_2FA_REQUIRED = "AUTH_2FA_REQUIRED",
  AUTH_2FA_INVALID = "AUTH_2FA_INVALID",

  // ======================
  // Access Control Errors
  // ======================
  ACCESS_UNAUTHORIZED = "ACCESS_UNAUTHORIZED",
  ACCESS_ROLE_REQUIRED = "ACCESS_ROLE_REQUIRED",
  ACCESS_PERMISSION_DENIED = "ACCESS_PERMISSION_DENIED",
  ACCESS_IP_RESTRICTED = "ACCESS_IP_RESTRICTED",

  // ======================
  // Validation & Data Errors
  // ======================
  VALIDATION_ERROR = "VALIDATION_ERROR",
  INVALID_INPUT = "INVALID_INPUT",
  MISSING_REQUIRED_FIELD = "MISSING_REQUIRED_FIELD",
  INVALID_FORMAT = "INVALID_FORMAT",
  OUT_OF_RANGE = "OUT_OF_RANGE",
  DUPLICATE_ENTRY = "DUPLICATE_ENTRY",
  DATA_CONFLICT = "DATA_CONFLICT",
  RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND",
  BAD_REQUEST = "BAD_REQUEST",
  UNSUPPORTED_MEDIA_TYPE = "UNSUPPORTED_MEDIA_TYPE",
  NOT_ACCEPTABLE = "NOT_ACCEPTABLE",
  ENTITY_TOO_LARGE = "ENTITY_TOO_LARGE",

  // ======================
  // Rate Limiting & Timeouts
  // ======================
  TOO_MANY_REQUESTS = "TOO_MANY_REQUESTS",
  REQUEST_TIMEOUT = "REQUEST_TIMEOUT",
  CONCURRENCY_LIMIT = "CONCURRENCY_LIMIT",
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",

  // ======================
  // Cors
  // ======================
  CORS_ERROR = "CORS_ERROR",
  VERIFICATION_ERROR = "VERIFICATION_ERROR",

  // ======================
  // System & Infrastructure
  // ======================
  INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
  GATEWAY_TIMEOUT = "GATEWAY_TIMEOUT",
  STORAGE_LIMIT_EXCEEDED = "STORAGE_LIMIT_EXCEEDED",
  DATABASE_ERROR = "DATABASE_ERROR",
  CACHE_ERROR = "CACHE_ERROR",
  EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR",
  NOT_IMPLEMENTED = "NOT_IMPLEMENTED",
  BAD_GATEWAY = "BAD_GATEWAY",
  MAINTENANCE_MODE = "MAINTENANCE_MODE",

  // ======================
  // Payment/Stripe Errors
  // ======================
  STRIPE_CARD_ERROR = "STRIPE_CARD_ERROR",
  STRIPE_RATE_LIMIT_ERROR = "STRIPE_RATE_LIMIT_ERROR",
  STRIPE_INVALID_REQUEST_ERROR = "STRIPE_INVALID_REQUEST_ERROR",
  STRIPE_API_ERROR = "STRIPE_API_ERROR",
  STRIPE_CONNECTION_ERROR = "STRIPE_CONNECTION_ERROR",
  STRIPE_AUTHENTICATION_ERROR = "STRIPE_AUTHENTICATION_ERROR",
  STRIPE_PROCESSING_ERROR = "STRIPE_PROCESSING_ERROR",
  STRIPE_IDEMPOTENCY_ERROR = "STRIPE_IDEMPOTENCY_ERROR",
  STRIPE_UNEXPECTED_ERROR = "STRIPE_UNEXPECTED_ERROR",
  STRIPE_INSUFFICIENT_FUNDS = "STRIPE_INSUFFICIENT_FUNDS",
  STRIPE_EXPIRED_CARD = "STRIPE_EXPIRED_CARD",
  STRIPE_DECLINED = "STRIPE_DECLINED",
  STRIPE_PROCESSING_RESTRICTED = "STRIPE_PROCESSING_RESTRICTED",
  STRIPE_WEBHOOK_ERROR = "STRIPE_WEBHOOK_ERROR",

  // POLAR
  POLAR_CUSTOMER_CREATION_FAILED = "POLAR_CUSTOMER_CREATION_FAILED",

  // ======================
  // Business Logic Errors
  // ======================
  BUSINESS_RULE_VIOLATION = "BUSINESS_RULE_VIOLATION",
  QUOTA_EXCEEDED = "QUOTA_EXCEEDED",
  SUBSCRIPTION_REQUIRED = "SUBSCRIPTION_REQUIRED",
  TRIAL_EXPIRED = "TRIAL_EXPIRED",
  PAYMENT_REQUIRED = "PAYMENT_REQUIRED",
}

/**
 * Extended Stripe error types with all possible variants
 */
export type StripeErrorType =
  | "StripeCardError"
  | "StripeRateLimitError"
  | "StripeInvalidRequestError"
  | "StripeAPIError"
  | "StripeConnectionError"
  | "StripeAuthenticationError"
  | "StripeIdempotencyError"
  | "StripePermissionError"
  | "StripeSignatureVerificationError"
  | "StripeWebhookError";

/**
 * Detailed mapping of Stripe decline codes to our error codes
 */
type StripeDeclineCodeMapping = {
  [code: string]: ErrorCode;
};

const stripeDeclineCodeMap: StripeDeclineCodeMapping = {
  card_declined: ErrorCode.STRIPE_DECLINED,
  expired_card: ErrorCode.STRIPE_EXPIRED_CARD,
  insufficient_funds: ErrorCode.STRIPE_INSUFFICIENT_FUNDS,
  lost_card: ErrorCode.STRIPE_CARD_ERROR,
  stolen_card: ErrorCode.STRIPE_CARD_ERROR,
  processing_error: ErrorCode.STRIPE_PROCESSING_ERROR,
  do_not_honor: ErrorCode.STRIPE_DECLINED,
  generic_decline: ErrorCode.STRIPE_DECLINED,
  currency_not_supported: ErrorCode.STRIPE_PROCESSING_RESTRICTED,
  transaction_not_allowed: ErrorCode.STRIPE_PROCESSING_RESTRICTED,
};

/**
 * Maps Stripe error types to our application error codes
 * Includes special handling for card decline codes
 */
function mapStripeErrorToCode(
  stripeErrorType: StripeErrorType,
  declineCode?: string
): ErrorCode {
  const baseMapping: Record<StripeErrorType, ErrorCode> = {
    StripeCardError: declineCode
      ? stripeDeclineCodeMap[declineCode] || ErrorCode.STRIPE_CARD_ERROR
      : ErrorCode.STRIPE_CARD_ERROR,
    StripeRateLimitError: ErrorCode.STRIPE_RATE_LIMIT_ERROR,
    StripeInvalidRequestError: ErrorCode.STRIPE_INVALID_REQUEST_ERROR,
    StripeAPIError: ErrorCode.STRIPE_API_ERROR,
    StripeConnectionError: ErrorCode.STRIPE_CONNECTION_ERROR,
    StripeAuthenticationError: ErrorCode.STRIPE_AUTHENTICATION_ERROR,
    StripeIdempotencyError: ErrorCode.STRIPE_IDEMPOTENCY_ERROR,
    StripePermissionError: ErrorCode.ACCESS_UNAUTHORIZED,
    StripeSignatureVerificationError: ErrorCode.VALIDATION_ERROR,
    StripeWebhookError: ErrorCode.STRIPE_WEBHOOK_ERROR,
  };

  return baseMapping[stripeErrorType] || ErrorCode.STRIPE_UNEXPECTED_ERROR;
}

export { ErrorCode, mapStripeErrorToCode, stripeDeclineCodeMap };
