ALTER TABLE "connections" DROP CONSTRAINT "connections_fromNodeId_unique";--> statement-breakpoint
ALTER TABLE "connections" DROP CONSTRAINT "connections_toNodeId_unique";--> statement-breakpoint
ALTER TABLE "connections" DROP CONSTRAINT "connections_unique_from_to_idx";--> statement-breakpoint
ALTER TABLE "connections" ADD CONSTRAINT "connections_unique_from_to_idx_from_to_input_output" UNIQUE("fromNodeId","toNodeId","fromOutput","toInput");