-- Add feed_token column to topic table for private RSS feed authentication
ALTER TABLE "topic" ADD COLUMN "feed_token" text;

-- Add feed_token column to collection table for private RSS feed authentication
ALTER TABLE "collection" ADD COLUMN "feed_token" text;
