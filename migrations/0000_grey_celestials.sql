CREATE TYPE "public"."account_type" AS ENUM('email', 'oauth');--> statement-breakpoint
CREATE TYPE "public"."address_type" AS ENUM('billing');--> statement-breakpoint
CREATE TYPE "public"."asset_type" AS ENUM('image', 'video', 'audio', 'document', 'other');--> statement-breakpoint
CREATE TYPE "public"."discount_type" AS ENUM('fixed_amount', 'percentage');--> statement-breakpoint
CREATE TYPE "public"."node_type" AS ENUM('initial');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('credit_card', 'debit_card', 'paypal', 'stripe', 'bank_transfer', 'cash_on_delivery');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'paid', 'failed', 'refunded', 'partially_refunded');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('super_admin', 'admin', 'user', 'guest');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'suspended', 'deleted', 'inactive');--> statement-breakpoint
CREATE TABLE "assets" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"resource_type" "asset_type" NOT NULL,
	"url" text NOT NULL,
	"thumbnail" text NOT NULL,
	"size" integer NOT NULL,
	"width" integer,
	"height" integer,
	"uploadedBy" text,
	"public_id" text NOT NULL,
	"surrogate_key" uuid DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "assets_url_unique" UNIQUE("url"),
	CONSTRAINT "assets_thumbnail_unique" UNIQUE("thumbnail")
);
--> statement-breakpoint
CREATE TABLE "connections" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"userId" text NOT NULL,
	"workflowId" text NOT NULL,
	"fromNodeId" text NOT NULL,
	"toNodeId" text NOT NULL,
	"fromOutput" text DEFAULT 'main',
	"toInput" text DEFAULT 'main',
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "connections_fromNodeId_unique" UNIQUE("fromNodeId"),
	CONSTRAINT "connections_toNodeId_unique" UNIQUE("toNodeId"),
	CONSTRAINT "connections_fromOutput_unique" UNIQUE("fromOutput"),
	CONSTRAINT "connections_toInput_unique" UNIQUE("toInput"),
	CONSTRAINT "connections_unique_from_to_idx" UNIQUE("fromNodeId","toNodeId"),
	CONSTRAINT "connections_unique_fromOutput_toInput_idx" UNIQUE("fromOutput","toInput")
);
--> statement-breakpoint
CREATE TABLE "nodes" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"userId" text NOT NULL,
	"workflowId" text NOT NULL,
	"type" "node_type" DEFAULT 'initial',
	"position" jsonb NOT NULL,
	"data" jsonb DEFAULT '{}',
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"surrogate_key" uuid DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"type" "account_type" NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text,
	"expires_at" integer,
	"token_type" text,
	"is_active" boolean DEFAULT true,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" varchar(255),
	"name" varchar(100),
	"phone" varchar(20),
	"image" varchar(500),
	"email_verified" timestamp,
	"polar_customer_id" varchar,
	"is_active" boolean DEFAULT true,
	"role" "role" DEFAULT 'user',
	"status" "user_status" DEFAULT 'active',
	"last_login" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "user_addresses" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"type" "address_type" DEFAULT 'billing' NOT NULL,
	"address1" varchar(255) NOT NULL,
	"address2" varchar(255),
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"company" varchar(255),
	"street" varchar(255) NOT NULL,
	"street2" varchar(255),
	"city" varchar(100) NOT NULL,
	"state" varchar(100) NOT NULL,
	"postal_code" varchar(20) NOT NULL,
	"country" varchar(5) NOT NULL,
	"phone" varchar(20),
	"is_default" boolean DEFAULT false,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "workflows" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"userId" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_uploadedBy_users_id_fk" FOREIGN KEY ("uploadedBy") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connections" ADD CONSTRAINT "connections_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connections" ADD CONSTRAINT "connections_workflowId_workflows_id_fk" FOREIGN KEY ("workflowId") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connections" ADD CONSTRAINT "connections_fromNodeId_nodes_id_fk" FOREIGN KEY ("fromNodeId") REFERENCES "public"."nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connections" ADD CONSTRAINT "connections_toNodeId_nodes_id_fk" FOREIGN KEY ("toNodeId") REFERENCES "public"."nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_workflowId_workflows_id_fk" FOREIGN KEY ("workflowId") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_addresses" ADD CONSTRAINT "user_addresses_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assets_uploaded_by_idx" ON "assets" USING btree ("uploadedBy");--> statement-breakpoint
CREATE INDEX "assets_public_id_idx" ON "assets" USING btree ("public_id");--> statement-breakpoint
CREATE INDEX "assets_type_idx" ON "assets" USING btree ("type");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "user_addresses_user_id_idx" ON "user_addresses" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "user_addresses_type_idx" ON "user_addresses" USING btree ("type");