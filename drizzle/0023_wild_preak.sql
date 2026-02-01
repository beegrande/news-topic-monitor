ALTER TABLE "topic" ADD COLUMN "schedule_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "topic" ADD COLUMN "schedule_days" text;--> statement-breakpoint
ALTER TABLE "topic" ADD COLUMN "schedule_start_hour" integer;--> statement-breakpoint
ALTER TABLE "topic" ADD COLUMN "schedule_end_hour" integer;--> statement-breakpoint
ALTER TABLE "topic" ADD COLUMN "schedule_timezone" text DEFAULT 'UTC';