import { ErrorCode } from "@/enums/error-code.enum";

const httpConfig = () =>
  ({
    // 2xx Success
    OK: 200,
    CREATED: 201,
    ACCEPTED: 202,
    NO_CONTENT: 204,

    // 3xx Redirection
    PAYMENT_REQUIRED: 402,

    // 4xx Client Errors
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    METHOD_NOT_ALLOWED: 405,
    NOT_ACCEPTABLE: 406,
    REQUEST_TIMEOUT: 408,
    CONFLICT: 409,
    GONE: 410,
    UNSUPPORTED_MEDIA_TYPE: 415,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    ENTITY_TOO_LARGE: 413,

    // 5xx Server Errors
    INTERNAL_SERVER_ERROR: 500,
    NOT_IMPLEMENTED: 501,
    BAD_GATEWAY: 502,
    SERVICE_UNAVAILABLE: 503,
    GATEWAY_TIMEOUT: 504,
    INSUFFICIENT_STORAGE: 507,
  } as const);

export const HTTPSTATUS = httpConfig();
export type HttpStatusCode = (typeof HTTPSTATUS)[keyof typeof HTTPSTATUS];

export const ErrorCodeToHttpStatusMap: Record<ErrorCode, HttpStatusCode> = {
  // ======================
  // Authentication Errors
  // ======================
  [ErrorCode.AUTH_EMAIL_ALREADY_EXISTS]: HTTPSTATUS.CONFLICT,
  [ErrorCode.AUTH_INVALID_CREDENTIALS]: HTTPSTATUS.UNAUTHORIZED,
  [ErrorCode.AUTH_INVALID_TOKEN]: HTTPSTATUS.UNAUTHORIZED,
  [ErrorCode.AUTH_EXPIRED_TOKEN]: HTTPSTATUS.UNAUTHORIZED,
  [ErrorCode.AUTH_USER_NOT_FOUND]: HTTPSTATUS.NOT_FOUND,
  [ErrorCode.AUTH_ACCOUNT_NOT_FOUND]: HTTPSTATUS.NOT_FOUND,
  [ErrorCode.AUTH_TOO_MANY_ATTEMPTS]: HTTPSTATUS.TOO_MANY_REQUESTS,
  [ErrorCode.AUTH_UNAUTHORIZED]: HTTPSTATUS.UNAUTHORIZED,
  [ErrorCode.AUTH_TOKEN_NOT_FOUND]: HTTPSTATUS.UNAUTHORIZED,
  [ErrorCode.AUTH_TOKEN_REUSED]: HTTPSTATUS.UNAUTHORIZED,
  [ErrorCode.AUTH_2FA_REQUIRED]: HTTPSTATUS.UNAUTHORIZED,
  [ErrorCode.AUTH_2FA_INVALID]: HTTPSTATUS.UNAUTHORIZED,

  // ======================
  // Access Control Errors
  // ======================
  [ErrorCode.ACCESS_UNAUTHORIZED]: HTTPSTATUS.FORBIDDEN,
  [ErrorCode.ACCESS_ROLE_REQUIRED]: HTTPSTATUS.FORBIDDEN,
  [ErrorCode.ACCESS_PERMISSION_DENIED]: HTTPSTATUS.FORBIDDEN,
  [ErrorCode.ACCESS_IP_RESTRICTED]: HTTPSTATUS.FORBIDDEN,

  // ======================
  // Validation & Data Errors
  // ======================
  [ErrorCode.VALIDATION_ERROR]: HTTPSTATUS.UNPROCESSABLE_ENTITY,
  [ErrorCode.INVALID_INPUT]: HTTPSTATUS.BAD_REQUEST,
  [ErrorCode.MISSING_REQUIRED_FIELD]: HTTPSTATUS.BAD_REQUEST,
  [ErrorCode.INVALID_FORMAT]: HTTPSTATUS.BAD_REQUEST,
  [ErrorCode.OUT_OF_RANGE]: HTTPSTATUS.BAD_REQUEST,
  [ErrorCode.DUPLICATE_ENTRY]: HTTPSTATUS.CONFLICT,
  [ErrorCode.DATA_CONFLICT]: HTTPSTATUS.CONFLICT,
  [ErrorCode.RESOURCE_NOT_FOUND]: HTTPSTATUS.NOT_FOUND,
  [ErrorCode.BAD_REQUEST]: HTTPSTATUS.BAD_REQUEST,
  [ErrorCode.UNSUPPORTED_MEDIA_TYPE]: HTTPSTATUS.UNSUPPORTED_MEDIA_TYPE,
  [ErrorCode.NOT_ACCEPTABLE]: HTTPSTATUS.NOT_ACCEPTABLE,
  [ErrorCode.ENTITY_TOO_LARGE]: HTTPSTATUS.ENTITY_TOO_LARGE,

  // ======================
  // Rate Limiting & Timeouts
  // ======================
  [ErrorCode.TOO_MANY_REQUESTS]: HTTPSTATUS.TOO_MANY_REQUESTS,
  [ErrorCode.REQUEST_TIMEOUT]: HTTPSTATUS.REQUEST_TIMEOUT,
  [ErrorCode.CONCURRENCY_LIMIT]: HTTPSTATUS.TOO_MANY_REQUESTS,
  [ErrorCode.RATE_LIMIT_EXCEEDED]: HTTPSTATUS.TOO_MANY_REQUESTS,

  // ======================
  // System & Infrastructure
  // ======================
  [ErrorCode.INTERNAL_SERVER_ERROR]: HTTPSTATUS.INTERNAL_SERVER_ERROR,
  [ErrorCode.SERVICE_UNAVAILABLE]: HTTPSTATUS.SERVICE_UNAVAILABLE,
  [ErrorCode.GATEWAY_TIMEOUT]: HTTPSTATUS.GATEWAY_TIMEOUT,
  [ErrorCode.STORAGE_LIMIT_EXCEEDED]: HTTPSTATUS.INSUFFICIENT_STORAGE,
  [ErrorCode.DATABASE_ERROR]: HTTPSTATUS.INTERNAL_SERVER_ERROR,
  [ErrorCode.CACHE_ERROR]: HTTPSTATUS.INTERNAL_SERVER_ERROR,
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: HTTPSTATUS.BAD_GATEWAY,
  [ErrorCode.NOT_IMPLEMENTED]: HTTPSTATUS.NOT_IMPLEMENTED,
  [ErrorCode.BAD_GATEWAY]: HTTPSTATUS.BAD_GATEWAY,
  [ErrorCode.MAINTENANCE_MODE]: HTTPSTATUS.SERVICE_UNAVAILABLE,
  [ErrorCode.CORS_ERROR]: HTTPSTATUS.BAD_REQUEST,
  [ErrorCode.VERIFICATION_ERROR]: HTTPSTATUS.INTERNAL_SERVER_ERROR,

  // ======================
  // Payment/Stripe Errors
  // ======================
  [ErrorCode.STRIPE_CARD_ERROR]: HTTPSTATUS.PAYMENT_REQUIRED,
  [ErrorCode.STRIPE_RATE_LIMIT_ERROR]: HTTPSTATUS.TOO_MANY_REQUESTS,
  [ErrorCode.STRIPE_INVALID_REQUEST_ERROR]: HTTPSTATUS.BAD_REQUEST,
  [ErrorCode.STRIPE_API_ERROR]: HTTPSTATUS.INTERNAL_SERVER_ERROR,
  [ErrorCode.STRIPE_CONNECTION_ERROR]: HTTPSTATUS.SERVICE_UNAVAILABLE,
  [ErrorCode.STRIPE_AUTHENTICATION_ERROR]: HTTPSTATUS.UNAUTHORIZED,
  [ErrorCode.STRIPE_PROCESSING_ERROR]: HTTPSTATUS.INTERNAL_SERVER_ERROR,
  [ErrorCode.STRIPE_IDEMPOTENCY_ERROR]: HTTPSTATUS.CONFLICT,
  [ErrorCode.STRIPE_UNEXPECTED_ERROR]: HTTPSTATUS.INTERNAL_SERVER_ERROR,
  [ErrorCode.STRIPE_INSUFFICIENT_FUNDS]: HTTPSTATUS.PAYMENT_REQUIRED,
  [ErrorCode.STRIPE_EXPIRED_CARD]: HTTPSTATUS.PAYMENT_REQUIRED,
  [ErrorCode.STRIPE_DECLINED]: HTTPSTATUS.PAYMENT_REQUIRED,
  [ErrorCode.STRIPE_PROCESSING_RESTRICTED]: HTTPSTATUS.PAYMENT_REQUIRED,

  // ======================
  // Business Logic Errors
  // ======================
  [ErrorCode.BUSINESS_RULE_VIOLATION]: HTTPSTATUS.CONFLICT,
  [ErrorCode.QUOTA_EXCEEDED]: HTTPSTATUS.TOO_MANY_REQUESTS,
  [ErrorCode.SUBSCRIPTION_REQUIRED]: HTTPSTATUS.PAYMENT_REQUIRED,
  [ErrorCode.TRIAL_EXPIRED]: HTTPSTATUS.PAYMENT_REQUIRED,
  [ErrorCode.PAYMENT_REQUIRED]: HTTPSTATUS.PAYMENT_REQUIRED,
  [ErrorCode.STRIPE_WEBHOOK_ERROR]: HTTPSTATUS.BAD_REQUEST,
  [ErrorCode.POLAR_CUSTOMER_CREATION_FAILED]: HTTPSTATUS.INTERNAL_SERVER_ERROR,
};

// Reverse mapping
export const HttpStatusToErrorCodeMap: Partial<
  Record<HttpStatusCode, ErrorCode[]>
> = Object.entries(ErrorCodeToHttpStatusMap).reduce(
  (acc, [errorCode, statusCode]) => {
    if (!acc[statusCode]) acc[statusCode] = [];
    acc[statusCode]!.push(errorCode as ErrorCode);
    return acc;
  },
  {} as Partial<Record<HttpStatusCode, ErrorCode[]>>
);

export const getHttpStatusFromErrorCode = (code: ErrorCode): HttpStatusCode => {
  return ErrorCodeToHttpStatusMap[code];
};

export const getErrorCodesFromHttpStatus = (
  status: HttpStatusCode
): ErrorCode[] | undefined => {
  return HttpStatusToErrorCodeMap[status];
};

/**
 * Gets the most appropriate error code for an HTTP status
 * Useful when you need to select a single error code from multiple possibilities
 */
export const getPrimaryErrorCodeForStatus = (
  status: HttpStatusCode
): ErrorCode | undefined => {
  const codes = HttpStatusToErrorCodeMap[status];
  if (!codes || codes.length === 0) return undefined;

  // Priority mapping for common statuses
  const priorityMap: Partial<Record<HttpStatusCode, ErrorCode>> = {
    [HTTPSTATUS.FORBIDDEN]: ErrorCode.ACCESS_UNAUTHORIZED,
    [HTTPSTATUS.UNAUTHORIZED]: ErrorCode.AUTH_UNAUTHORIZED,
    [HTTPSTATUS.NOT_FOUND]: ErrorCode.RESOURCE_NOT_FOUND,
    [HTTPSTATUS.CONFLICT]: ErrorCode.DATA_CONFLICT,
    [HTTPSTATUS.PAYMENT_REQUIRED]: ErrorCode.STRIPE_CARD_ERROR,
    [HTTPSTATUS.TOO_MANY_REQUESTS]: ErrorCode.RATE_LIMIT_EXCEEDED,
    [HTTPSTATUS.UNPROCESSABLE_ENTITY]: ErrorCode.VALIDATION_ERROR,
  };

  return priorityMap[status] || codes[0];
};
