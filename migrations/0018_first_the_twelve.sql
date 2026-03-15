CREATE TABLE "executions" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"userId" text NOT NULL,
	"secret" text,
	"started_at" timestamp with time zone DEFAULT now(),
	"inngest_event_id" text NOT NULL,
	"output" jsonb,
	"workflowId" text,
	"status" "execution_status" DEFAULT 'RUNNING' NOT NULL,
	"error" text,
	"error_stack" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "executions_inngest_event_id_unique" UNIQUE("inngest_event_id")
);
--> statement-breakpoint
ALTER TABLE "executions" ADD CONSTRAINT "executions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "executions" ADD CONSTRAINT "executions_workflowId_workflows_id_fk" FOREIGN KEY ("workflowId") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE no action;