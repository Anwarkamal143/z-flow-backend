export enum Role {
  USER = "user",
  ADMIN = "admin",
  GUEST = "guest",
  SUPER_ADMIN = "super_admin",
}
export type IRole = `${Role}`;
export enum Provider {
  email = "email",
  google = "google",
  github = "github",
  linkedIn = "linkedIn",
}
export type IProviderType = `${Provider}`;
export enum AccountType {
  oauth = "oauth",
  email = "email",
}
export type IAccountType = `${AccountType}`;
export enum AccountStatus {
  PENDING = "pending",
  ACTIVE = "active",
  SUSPENDED = "suspended",
  DELETED = "deleted",
}
export type IAccountStatus = `${AccountStatus}`;

export enum PaymentStatus {
  PENDING = "pending",
  PAID = "paid",
  FAILED = "failed",
  REFUNDED = "refunded",
  PARTIALLY_REFUNDED = "partially_refunded",
}
export type IPaymentStatus = `${PaymentStatus}`;
export enum PaymentMethod {
  CREDIT_CARD = "credit_card",
  DEBIT_CARD = "debit_card",
  PAYPAL = "paypal",
  STRIPE = "stripe",
  BANK_TRANSFER = "bank_transfer",
  CASH_ON_DELIVERY = "cash_on_delivery",
}

export type IPaymentMethod = `${PaymentMethod}`;
export enum AssetType {
  IMAGE = "image",
  VIDEO = "video",
  AUDIO = "audio",
  DOCUMENT = "document",
  OTHER = "other",
}
export type IAssetType = `${AssetType}`;

export enum UserStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  SUSPENDED = "suspended",
  DELETED = "deleted",
}
export type IUserStatus = `${UserStatus}`;

export enum UserAddressType {
  BILLING = "billing",
}
export type IUserAddressType = `${UserAddressType}`;
export enum DiscountType {
  PERCENTAGE = "percentage",
  FIXED_AMOUNT = "fixed_amount",
}
export type IDiscountType = `${DiscountType}`;
export enum NodeType {
  INITIAL = "initial",
  MANUAL_TRIGGER = "manual_trigger",
  HTTP_REQUEST = "http_request",
  GOOGLE_FORM_TRIGGER = "google_form_trigger",
  STRIPE_TRIGGER = "stripe_trigger",
  ANTHROPIC = "anthropic",
  GEMINI = "gemini",
  OPENAI = "openai",
  DISCORD = "discord",
  SLACK = "slack",
}
export type INodeType = `${NodeType}`;
export enum CredentialType {
  ANTHROPIC = NodeType.ANTHROPIC,
  GEMINI = NodeType.GEMINI,
  OPENAI = NodeType.OPENAI,
}

export type ICredentialType = `${CredentialType}`;
export enum ExecutionStatusType {
  RUNNING = "RUNNING",
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
}

export type IExecutionStatusType = `${ExecutionStatusType}`;
