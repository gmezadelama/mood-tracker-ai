import "server-only";

import { and, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { aiRecommendations, moodEntries, type AiRecommendationRow } from "@/db/schema";
import type { MoodRecommendations } from "@/domain/ai/schema";
import type { Feeling, MoodValue } from "@/domain/mood/constants";
import type { MoodEntryResponse } from "@/server/mood-entries";

import { loadAiConfig } from "./config";
import { AiGenerationError, generateMoodRecommendations } from "./gemini";
import { getRemainingDailyQuota, tryConsumeDailyQuota } from "./quota";
import { ForbiddenError, NotFoundError } from "../errors";

// The user may request AI recommendations for their current entry and the
// three immediately preceding it — never arbitrary older history.
export const AI_ELIGIBLE_WINDOW = 4;

export interface AiRecommendationResponse {
  activities: string[];
  phrases: string[];
  createdAt: string;
}

export type RecommendationsResult =
  | { status: "ready"; recommendation: AiRecommendationResponse }
  | { status: "quota_exhausted" }
  | { status: "unavailable" };

/**
 * Generates (or returns the already-persisted) AI recommendations for one
 * mood entry, enforcing ownership, eligibility, and quota in that order.
 *
 * Race behavior: two simultaneous requests for the *same* entry both pass
 * the "does a recommendation already exist" check before either has
 * written one, so both may reserve quota and call Gemini — that's an
 * accepted, documented cost, not silently swallowed. What's guaranteed is
 * that only one row is ever persisted: the loser's insert hits the
 * one-row-per-entry primary key, is caught, and the loser returns the
 * winner's row instead of erroring or overwriting it. No distributed lock
 * is used; the database constraint is the real guard.
 */
export async function requestMoodRecommendations(
  userId: number,
  moodEntryId: number,
): Promise<RecommendationsResult> {
  const entry = await findOwnedMoodEntry(userId, moodEntryId);
  if (!entry) {
    // Same response whether the entry doesn't exist or belongs to another
    // user — never confirm another user's entry id exists.
    throw new NotFoundError("Mood entry not found");
  }

  const eligibleIds = await listEligibleEntryIds(userId);
  if (!eligibleIds.includes(moodEntryId)) {
    throw new ForbiddenError(
      "AI recommendations are only available for your current entry and the previous 3",
    );
  }

  const existing = await findAiRecommendation(moodEntryId);
  if (existing) {
    return { status: "ready", recommendation: toRecommendationResponse(existing) };
  }

  const config = loadAiConfig();
  if (!config) {
    return { status: "unavailable" };
  }

  const reserved = await tryConsumeDailyQuota(userId, config.dailyLimit);
  if (!reserved) {
    return { status: "quota_exhausted" };
  }

  try {
    const recommendations = await generateMoodRecommendations(config, {
      mood: entry.mood as MoodValue,
      feelings: entry.feelings as Feeling[],
      journalEntry: entry.journalEntry,
      sleepRange: entry.sleepRange,
    });
    const saved = await saveAiRecommendation(moodEntryId, recommendations);
    return { status: "ready", recommendation: toRecommendationResponse(saved) };
  } catch (error) {
    if (error instanceof AiGenerationError) {
      // Quota stays consumed (already reserved above); nothing invalid is
      // persisted. The client only ever sees a generic "unavailable"
      // result, never provider details.
      return { status: "unavailable" };
    }
    throw error;
  }
}

/**
 * Enriches an already-fetched entry list with each entry's persisted AI
 * recommendation (if any) and the user's remaining daily quota. Additive
 * only — every existing `MoodEntryResponse` field is untouched. This
 * avoids a second per-entry round trip from the client: the dashboard
 * already fetches this same list to render mood history, so folding AI
 * state into it is one extra query instead of up to four.
 */
export async function attachAiMetadata(
  userId: number,
  entries: MoodEntryResponse[],
): Promise<{
  entries: (MoodEntryResponse & { aiRecommendation: AiRecommendationResponse | null })[];
  aiQuotaRemaining: number;
  aiStatus: "available" | "unavailable";
}> {
  const ids = entries.map((entry) => entry.id);
  const recommendationsByEntryId = await findAiRecommendations(ids);
  const config = loadAiConfig();
  // aiQuotaRemaining is 0 in both the "exhausted" and "misconfigured" cases,
  // so aiStatus carries the distinction separately — the client must not
  // infer "unavailable" from a zero quota alone (a missing/invalid config
  // won't be fixed by waiting for tomorrow's reset).
  const aiQuotaRemaining = config ? await getRemainingDailyQuota(userId, config.dailyLimit) : 0;

  return {
    entries: entries.map((entry) => ({
      ...entry,
      aiRecommendation: recommendationsByEntryId.has(entry.id)
        ? toRecommendationResponse(recommendationsByEntryId.get(entry.id)!)
        : null,
    })),
    aiQuotaRemaining,
    aiStatus: config ? "available" : "unavailable",
  };
}

async function findOwnedMoodEntry(userId: number, moodEntryId: number) {
  const [row] = await db
    .select()
    .from(moodEntries)
    .where(and(eq(moodEntries.id, moodEntryId), eq(moodEntries.userId, userId)))
    .limit(1);
  return row;
}

async function listEligibleEntryIds(userId: number): Promise<number[]> {
  const rows = await db
    .select({ id: moodEntries.id })
    .from(moodEntries)
    .where(eq(moodEntries.userId, userId))
    .orderBy(desc(moodEntries.entryDate))
    .limit(AI_ELIGIBLE_WINDOW);
  return rows.map((row) => row.id);
}

async function findAiRecommendation(moodEntryId: number) {
  const [row] = await db
    .select()
    .from(aiRecommendations)
    .where(eq(aiRecommendations.moodEntryId, moodEntryId))
    .limit(1);
  return row;
}

async function findAiRecommendations(moodEntryIds: number[]) {
  if (moodEntryIds.length === 0) return new Map<number, AiRecommendationRow>();
  const rows = await db
    .select()
    .from(aiRecommendations)
    .where(inArray(aiRecommendations.moodEntryId, moodEntryIds));
  return new Map(rows.map((row) => [row.moodEntryId, row]));
}

async function saveAiRecommendation(
  moodEntryId: number,
  recommendations: MoodRecommendations,
): Promise<AiRecommendationRow> {
  const [row] = await db
    .insert(aiRecommendations)
    .values({
      moodEntryId,
      activities: recommendations.activities,
      phrases: recommendations.phrases,
    })
    .onConflictDoNothing()
    .returning();
  if (row) return row;

  // Lost the race — another concurrent request for this same entry
  // already persisted its recommendation first. The one-row-per-entry
  // primary key is the real guard; re-read instead of erroring.
  const existing = await findAiRecommendation(moodEntryId);
  if (!existing) throw new Error("Failed to persist AI recommendation");
  return existing;
}

function toRecommendationResponse(row: AiRecommendationRow): AiRecommendationResponse {
  return {
    activities: row.activities,
    phrases: row.phrases,
    createdAt: row.createdAt.toISOString(),
  };
}
