ALTER TABLE "article" ADD COLUMN "content_hash" text;--> statement-breakpoint
CREATE INDEX "article_content_hash_idx" ON "article" ("content_hash");