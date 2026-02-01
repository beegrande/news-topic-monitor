ALTER TABLE "article" ADD COLUMN "content_hash" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "email_digest_frequency" text NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "last_digest_sent_at" timestamp;