ALTER TABLE "article" ADD COLUMN "is_archived" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "article" ADD COLUMN "archived_at" timestamp;