CREATE TABLE "saved_search" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"query" text NOT NULL,
	"topic_ids" text,
	"source" text,
	"date_range_type" text,
	"date_from" timestamp,
	"date_to" timestamp,
	"user_id" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_credibility" (
	"id" text PRIMARY KEY NOT NULL,
	"source_name" text NOT NULL,
	"credibility_score" integer,
	"accuracy_rating" real,
	"transparency_rating" real,
	"bias_rating" real,
	"user_feedback_score" real,
	"user_feedback_count" integer NOT NULL,
	"article_count" integer NOT NULL,
	"last_calculated_at" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "source_credibility_source_name_unique" UNIQUE("source_name")
);
--> statement-breakpoint
CREATE TABLE "source_feedback" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"source_credibility_id" text NOT NULL,
	"rating" integer NOT NULL,
	"feedback" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "collection" ADD COLUMN "feed_token" text;--> statement-breakpoint
ALTER TABLE "topic" ADD COLUMN "feed_token" text;--> statement-breakpoint
ALTER TABLE "saved_search" ADD CONSTRAINT "saved_search_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_feedback" ADD CONSTRAINT "source_feedback_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_feedback" ADD CONSTRAINT "source_feedback_source_credibility_id_source_credibility_id_fk" FOREIGN KEY ("source_credibility_id") REFERENCES "public"."source_credibility"("id") ON DELETE cascade ON UPDATE no action;