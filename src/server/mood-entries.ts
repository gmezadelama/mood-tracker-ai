import "server-only";

import { NeonDbError } from "@neondatabase/serverless";
import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { moodEntries, type MoodEntryRow } from "@/db/schema";
import type { Feeling, MoodValue, SleepRange } from "@/domain/mood/constants";
import { moodEntryInputSchema, type MoodEntryInput } from "@/domain/mood/validation";

import { ConflictError, ValidationError } from "./errors";

// Matches the Frontend Mentor design's own bound: the trend graph shows the
// most recent 11 records, which also comfortably covers the 5-vs-previous-5
// average comparison (10 records) computed client-side from the same list.
const MAX_RECENT_ENTRIES = 11;

export interface MoodEntryResponse {
  id: number;
  entryDate: string;
  mood: MoodValue;
  feelings: Feeling[];
  journalEntry: string;
  sleepRange: SleepRange;
  createdAt: string;
  updatedAt: string;
}

export function parseMoodEntryInput(payload: unknown): MoodEntryInput {
  const result = moodEntryInputSchema.safeParse(payload);
  if (!result.success) {
    throw new ValidationError(
      "Invalid mood entry",
      result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    );
  }
  return result.data;
}

export async function createMoodEntry(
  userId: number,
  input: MoodEntryInput,
): Promise<MoodEntryResponse> {
  try {
    const [row] = await db
      .insert(moodEntries)
      .values({ userId, ...input })
      .returning();
    return toResponse(row);
  } catch (error) {
    if (isUniqueViolation(error)) {
      // One entry per user per day (UNIQUE(user_id, entry_date)) — the FM
      // feature list only describes logging and viewing today's entry, not
      // editing it, so a repeat log for the same day is rejected rather
      // than silently replacing what's there.
      throw new ConflictError("A mood entry already exists for that day");
    }
    throw error;
  }
}

export async function listRecentMoodEntries(
  userId: number,
  limit = MAX_RECENT_ENTRIES,
): Promise<MoodEntryResponse[]> {
  const boundedLimit = Math.min(Math.max(Math.trunc(limit), 1), MAX_RECENT_ENTRIES);

  const rows = await db
    .select()
    .from(moodEntries)
    .where(eq(moodEntries.userId, userId))
    .orderBy(desc(moodEntries.entryDate))
    .limit(boundedLimit);

  return rows.map(toResponse);
}

function toResponse(row: MoodEntryRow): MoodEntryResponse {
  return {
    id: row.id,
    entryDate: row.entryDate,
    mood: row.mood as MoodValue,
    feelings: row.feelings as Feeling[],
    journalEntry: row.journalEntry,
    sleepRange: row.sleepRange as SleepRange,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// drizzle-orm's neon-http driver wraps the real NeonDbError in its own
// query-failure Error, chaining the original via `cause` (confirmed against
// a live duplicate-insert: the object reaching this catch is the wrapper,
// not the NeonDbError itself).
function isUniqueViolation(error: unknown): boolean {
  if (error instanceof NeonDbError) return error.code === "23505";
  if (error instanceof Error && error.cause instanceof NeonDbError) {
    return error.cause.code === "23505";
  }
  return false;
}
