ALTER TABLE "topic" ADD COLUMN "parent_id" text;--> statement-breakpoint
ALTER TABLE "topic" ADD COLUMN "position" integer NOT NULL DEFAULT 0;