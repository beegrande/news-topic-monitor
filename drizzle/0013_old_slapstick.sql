ALTER TABLE "topic" ADD COLUMN "notification_enabled" boolean NOT NULL;--> statement-breakpoint
ALTER TABLE "topic" ADD COLUMN "notification_frequency" text NOT NULL;--> statement-breakpoint
ALTER TABLE "topic" ADD COLUMN "minimum_relevance_score" real NOT NULL;