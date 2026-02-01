CREATE TABLE "article_interaction" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"article_id" text NOT NULL,
	"topic_id" text NOT NULL,
	"interaction_type" text NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "article_topic" ADD COLUMN "relevance_score" real;--> statement-breakpoint
ALTER TABLE "topic" ADD COLUMN "included_sources" text;--> statement-breakpoint
ALTER TABLE "topic" ADD COLUMN "excluded_sources" text;--> statement-breakpoint
ALTER TABLE "article_interaction" ADD CONSTRAINT "article_interaction_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_interaction" ADD CONSTRAINT "article_interaction_article_id_article_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."article"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_interaction" ADD CONSTRAINT "article_interaction_topic_id_topic_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topic"("id") ON DELETE cascade ON UPDATE no action;