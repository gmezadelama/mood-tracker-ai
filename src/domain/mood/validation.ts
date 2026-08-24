import { z } from "zod";

import {
  FEELINGS,
  JOURNAL_ENTRY_MAX_LENGTH,
  MAX_FEELINGS_PER_ENTRY,
  MOOD_VALUES,
  SLEEP_RANGES,
} from "./constants";

export const feelingSchema = z.enum(FEELINGS);
export const moodValueSchema = z.union(
  MOOD_VALUES.map((value) => z.literal(value)),
);
export const sleepRangeSchema = z.enum(SLEEP_RANGES);

// Local calendar day (YYYY-MM-DD), not a timestamp — the client sends the
// date it's logging for directly, so the server never has to guess a day
// from a UTC instant.
export const entryDateSchema = z.iso.date();

export const moodEntryInputSchema = z.object({
  entryDate: entryDateSchema,
  mood: moodValueSchema,
  feelings: z.array(feelingSchema).max(MAX_FEELINGS_PER_ENTRY),
  journalEntry: z.string().trim().min(1).max(JOURNAL_ENTRY_MAX_LENGTH),
  sleepRange: sleepRangeSchema,
});

export type MoodEntryInput = z.infer<typeof moodEntryInputSchema>;
