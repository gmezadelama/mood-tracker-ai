import { relations, sql } from "drizzle-orm";
import {
  bigint,
  check,
  date,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";

import { SLEEP_RANGES } from "@/domain/mood/constants";

export const sleepRangeEnum = pgEnum("sleep_range", SLEEP_RANGES);

export const users = pgTable("users", {
  id: bigint("id", { mode: "bigint" })
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
    id: bigint("id", { mode: "bigint" })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    userId: bigint("user_id", { mode: "bigint" })
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

export const usersRelations = relations(users, ({ many }) => ({
  moodEntries: many(moodEntries),
}));

export const moodEntriesRelations = relations(moodEntries, ({ one }) => ({
  user: one(users, {
    fields: [moodEntries.userId],
    references: [users.id],
  }),
}));

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
export type MoodEntryRow = typeof moodEntries.$inferSelect;
export type NewMoodEntryRow = typeof moodEntries.$inferInsert;
