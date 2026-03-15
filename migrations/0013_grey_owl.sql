CREATE TABLE "node_credentials" (
	"nodeId" text NOT NULL,
	"credentialId" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "node_credentials" ADD CONSTRAINT "node_credentials_nodeId_nodes_id_fk" FOREIGN KEY ("nodeId") REFERENCES "public"."nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "node_credentials" ADD CONSTRAINT "node_credentials_credentialId_credentials_id_fk" FOREIGN KEY ("credentialId") REFERENCES "public"."credentials"("id") ON DELETE cascade ON UPDATE no action;