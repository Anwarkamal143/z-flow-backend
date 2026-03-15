import { toUTC } from "@/utils/date-time";
import { boolean, pgEnum, timestamp } from "drizzle-orm/pg-core";
import {
  AccountType,
  AssetType,
  CredentialType,
  DiscountType,
  ExecutionStatusType,
  NodeType,
  PaymentMethod,
  PaymentStatus,
  Role,
  UserAddressType,
  UserStatus,
} from "./enumTypes";

export const roleEnum = pgEnum("role", [
  Role.SUPER_ADMIN,
  Role.ADMIN,
  Role.USER,
  Role.GUEST,
]);
export const addressTypeEnum = pgEnum("address_type", [
  UserAddressType.BILLING,
]);

export const discountTypeEnum = pgEnum("discount_type", [
  DiscountType.FIXED_AMOUNT,
  DiscountType.PERCENTAGE,
]);

export const accountTypeEnum = pgEnum("account_type", [
  AccountType.email,
  AccountType.oauth,
]);

// Enum for payment status
export const paymentStatusEnum = pgEnum("payment_status", [
  PaymentStatus.PENDING,
  PaymentStatus.PAID,
  PaymentStatus.FAILED,
  PaymentStatus.REFUNDED,
  PaymentStatus.PARTIALLY_REFUNDED,
]);

// Enum for payment method
export const paymentMethodEnum = pgEnum("payment_method", [
  PaymentMethod.CREDIT_CARD,
  PaymentMethod.DEBIT_CARD,
  PaymentMethod.PAYPAL,
  PaymentMethod.STRIPE,
  PaymentMethod.BANK_TRANSFER,
  PaymentMethod.CASH_ON_DELIVERY,
]);
export const assetTypeEnum = pgEnum("asset_type", [
  AssetType.IMAGE,

  AssetType.VIDEO,
  AssetType.AUDIO,
  AssetType.DOCUMENT,
  AssetType.OTHER,
]);
export const userStatusEnum = pgEnum("user_status", [
  UserStatus.ACTIVE,
  UserStatus.SUSPENDED,
  UserStatus.DELETED,
  UserStatus.INACTIVE,
]);

export const nodeTypeEnum = pgEnum("node_type", [
  NodeType.INITIAL,
  NodeType.MANUAL_TRIGGER,
  NodeType.HTTP_REQUEST,
  NodeType.GOOGLE_FORM_TRIGGER,
  NodeType.STRIPE_TRIGGER,
  NodeType.ANTHROPIC,
  NodeType.GEMINI,
  NodeType.OPENAI,
  NodeType.DISCORD,
  NodeType.SLACK,
]);
export const credentialsTypeEnum = pgEnum("credential_type", [
  CredentialType.ANTHROPIC,
  CredentialType.GEMINI,
  CredentialType.OPENAI,
]);
export const executionsStatusEnum = pgEnum("execution_status", [
  ExecutionStatusType.RUNNING,
  ExecutionStatusType.SUCCESS,
  ExecutionStatusType.FAILED,
]);

// export const productVisiblityEnum = pgEnum('product_visibility', [
//   ProductVisiblity.PUBLIC,
//   ProductVisiblity.PRIVATE,
//   ProductVisiblity.ARCHIVED,
// ]);
export const isActive = boolean("is_active").default(true);

/* =========================
   COMMON: timestamps + soft delete
   ========================= */
export const baseTimestamps = {
  updated_at: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => toUTC(new Date(), false))
    .notNull(),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  deleted_at: timestamp("deleted_at", { withTimezone: true }),
};
