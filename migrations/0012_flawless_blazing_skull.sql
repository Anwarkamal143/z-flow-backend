CREATE TYPE "public"."credential_type" AS ENUM('anthropic', 'gemini', 'openai');--> statement-breakpoint
ALTER TABLE "secrets" RENAME TO "credentials";--> statement-breakpoint
ALTER TABLE "credentials" DROP CONSTRAINT "secrets_workflowId_workflows_id_fk";
--> statement-breakpoint
ALTER TABLE "credentials" DROP CONSTRAINT "secrets_nodeId_nodes_id_fk";
--> statement-breakpoint
ALTER TABLE "credentials" DROP CONSTRAINT "secrets_userId_users_id_fk";
--> statement-breakpoint
ALTER TABLE "nodes" ALTER COLUMN "data" SET DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "nodes" ADD COLUMN "credentialId" text;--> statement-breakpoint
ALTER TABLE "credentials" ADD COLUMN "type" "credential_type" NOT NULL;--> statement-breakpoint
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_credentialId_credentials_id_fk" FOREIGN KEY ("credentialId") REFERENCES "public"."credentials"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credentials" DROP COLUMN "workflowId";--> statement-breakpoint
ALTER TABLE "credentials" DROP COLUMN "nodeId";