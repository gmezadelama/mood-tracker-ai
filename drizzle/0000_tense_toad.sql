CREATE TYPE "public"."sleep_range" AS ENUM('ZERO_TO_TWO', 'THREE_TO_FOUR', 'FIVE_TO_SIX', 'SEVEN_TO_EIGHT', 'NINE_PLUS');--> statement-breakpoint
CREATE TABLE "mood_entries" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "mood_entries_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" bigint NOT NULL,
	"entry_date" date NOT NULL,
	"mood" smallint NOT NULL,
	"feelings" text[] NOT NULL,
	"journal_entry" text NOT NULL,
	"sleep_range" "sleep_range" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mood_entries_user_id_entry_date_unique" UNIQUE("user_id","entry_date"),
	CONSTRAINT "mood_entries_mood_check" CHECK ("mood_entries"."mood" between -2 and 2)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"clerk_user_id" text NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_clerk_user_id_unique" UNIQUE("clerk_user_id")
);
--> statement-breakpoint
ALTER TABLE "mood_entries" ADD CONSTRAINT "mood_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;