ALTER TABLE "user" ADD COLUMN "anthropic_api_key" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "anthropic_api_key_updated_at" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "news_provider" text;