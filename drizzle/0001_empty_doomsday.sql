CREATE TABLE "ai_quota" (
	"user_id" bigint NOT NULL,
	"quota_date" date NOT NULL,
	"consumed_count" smallint DEFAULT 0 NOT NULL,
	CONSTRAINT "ai_quota_user_id_quota_date_pk" PRIMARY KEY("user_id","quota_date")
);
--> statement-breakpoint
CREATE TABLE "ai_recommendations" (
	"mood_entry_id" bigint PRIMARY KEY NOT NULL,
	"activities" text[] NOT NULL,
	"phrases" text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_quota" ADD CONSTRAINT "ai_quota_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_recommendations" ADD CONSTRAINT "ai_recommendations_mood_entry_id_mood_entries_id_fk" FOREIGN KEY ("mood_entry_id") REFERENCES "public"."mood_entries"("id") ON DELETE cascade ON UPDATE no action;