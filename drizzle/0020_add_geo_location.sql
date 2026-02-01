-- Add geographic location fields to article table
ALTER TABLE "article" ADD COLUMN "country" text;
ALTER TABLE "article" ADD COLUMN "country_code" text;
ALTER TABLE "article" ADD COLUMN "region" text;
ALTER TABLE "article" ADD COLUMN "city" text;
ALTER TABLE "article" ADD COLUMN "latitude" real;
ALTER TABLE "article" ADD COLUMN "longitude" real;

-- Add index for country filtering (most common use case)
CREATE INDEX IF NOT EXISTS "article_country_idx" ON "article" ("country");
CREATE INDEX IF NOT EXISTS "article_country_code_idx" ON "article" ("country_code");
