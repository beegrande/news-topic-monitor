CREATE TABLE "topic_collaborator" (
	"id" text PRIMARY KEY NOT NULL,
	"topic_id" text NOT NULL,
	"user_id" text NOT NULL,
	"permission" text NOT NULL,
	"added_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "topic_collaborator" ADD CONSTRAINT "topic_collaborator_topic_id_topic_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topic"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_collaborator" ADD CONSTRAINT "topic_collaborator_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;