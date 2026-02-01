ALTER TABLE "article" ADD COLUMN "fact_check_status" text;--> statement-breakpoint
ALTER TABLE "article" ADD COLUMN "credibility_score" integer;--> statement-breakpoint
ALTER TABLE "article" ADD COLUMN "fact_check_sources" text;--> statement-breakpoint
ALTER TABLE "article" ADD COLUMN "fact_checked_at" timestamp;--> statement-breakpoint
ALTER TABLE "article" ADD COLUMN "country" text;--> statement-breakpoint
ALTER TABLE "article" ADD COLUMN "country_code" text;--> statement-breakpoint
ALTER TABLE "article" ADD COLUMN "region" text;--> statement-breakpoint
ALTER TABLE "article" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "article" ADD COLUMN "latitude" real;--> statement-breakpoint
ALTER TABLE "article" ADD COLUMN "longitude" real;--> statement-breakpoint
ALTER TABLE "article" ADD COLUMN "language" text;--> statement-breakpoint
ALTER TABLE "article" ADD COLUMN "original_language" text;--> statement-breakpoint
ALTER TABLE "article" ADD COLUMN "translated_summary" text;--> statement-breakpoint
ALTER TABLE "topic" ADD COLUMN "languages" text;