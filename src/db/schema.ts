import { relations, sql } from "drizzle-orm";
import {
  bigint,
  check,
  date,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";

import { SLEEP_RANGES } from "@/domain/mood/constants";

export const sleepRangeEnum = pgEnum("sleep_range", SLEEP_RANGES);

export const users = pgTable("users", {
  id: bigint("id", { mode: "number" })
    .primaryKey()
    .generatedAlwaysAsIdentity(),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const moodEntries = pgTable(
  "mood_entries",
  {
    id: bigint("id", { mode: "number" })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    userId: bigint("user_id", { mode: "number" })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    entryDate: date("entry_date", { mode: "string" }).notNull(),
    mood: smallint("mood").notNull(),
    feelings: text("feelings").array().notNull(),
    journalEntry: text("journal_entry").notNull(),
    sleepRange: sleepRangeEnum("sleep_range").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check("mood_entries_mood_check", sql`${table.mood} between -2 and 2`),
    unique("mood_entries_user_id_entry_date_unique").on(
      table.userId,
      table.entryDate,
    ),
  ],
);

// One row per mood entry, at most — moodEntryId is the primary key itself
// (not a separate surrogate id) so "at most one recommendation per entry"
// is a structural guarantee, not just an application-level check.
export const aiRecommendations = pgTable("ai_recommendations", {
  moodEntryId: bigint("mood_entry_id", { mode: "number" })
    .primaryKey()
    .references(() => moodEntries.id, { onDelete: "cascade" }),
  activities: text("activities").array().notNull(),
  phrases: text("phrases").array().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Tracks how many AI requests a user has spent on a given UTC calendar
// day. The composite primary key on (user_id, quota_date) is what the
// atomic "insert or conditionally increment" upsert conflicts on.
export const aiQuota = pgTable(
  "ai_quota",
  {
    userId: bigint("user_id", { mode: "number" })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    quotaDate: date("quota_date", { mode: "string" }).notNull(),
    consumedCount: smallint("consumed_count").notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.userId, table.quotaDate] })],
);

export const usersRelations = relations(users, ({ many }) => ({
  moodEntries: many(moodEntries),
}));

export const moodEntriesRelations = relations(moodEntries, ({ one }) => ({
  user: one(users, {
    fields: [moodEntries.userId],
    references: [users.id],
  }),
  aiRecommendation: one(aiRecommendations, {
    fields: [moodEntries.id],
    references: [aiRecommendations.moodEntryId],
  }),
}));

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
export type MoodEntryRow = typeof moodEntries.$inferSelect;
export type NewMoodEntryRow = typeof moodEntries.$inferInsert;
export type AiRecommendationRow = typeof aiRecommendations.$inferSelect;
export type NewAiRecommendationRow = typeof aiRecommendations.$inferInsert;
export type AiQuotaRow = typeof aiQuota.$inferSelect;
