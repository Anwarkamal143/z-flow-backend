CREATE TABLE "secrets" (
	"id" text PRIMARY KEY NOT NULL,
	"workflowId" text,
	"nodeId" text,
	"userId" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"secret_ciphertext" text NOT NULL,
	"secret_iv" text NOT NULL,
	"secret_auth_tag" text NOT NULL,
	"dek_ciphertext" text NOT NULL,
	"dek_iv" text NOT NULL,
	"dek_auth_tag" text NOT NULL,
	"dek_salt" text NOT NULL,
	"key_version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "secrets" ADD CONSTRAINT "secrets_workflowId_workflows_id_fk" FOREIGN KEY ("workflowId") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "secrets" ADD CONSTRAINT "secrets_nodeId_nodes_id_fk" FOREIGN KEY ("nodeId") REFERENCES "public"."nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "secrets" ADD CONSTRAINT "secrets_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;