ALTER TABLE "executions" ALTER COLUMN "started_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "executions" ADD COLUMN "completed_at" timestamp with time zone DEFAULT now();