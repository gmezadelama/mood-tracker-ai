import {
  SLEEP_CHART_VALUES,
  SLEEP_RANGES,
  type Feeling,
  type MoodValue,
  type SleepRange,
} from "@/domain/mood/constants";

import type { AiRecommendation, MockMoodEntry, MockSleepRange } from "./mock-data";

interface MoodEntryResponse {
  id: number;
  entryDate: string;
  mood: MoodValue;
  feelings: Feeling[];
  journalEntry: string;
  sleepRange: SleepRange;
  createdAt: string;
  updatedAt: string;
  aiRecommendation?: AiRecommendation | null;
}

interface MoodEntriesResponse {
  entries: MoodEntryResponse[];
  aiQuotaRemaining: number;
}

interface MoodEntryCreatedResponse {
  entry: MoodEntryResponse;
}

export interface MoodEntryDraft {
  entryDate: string;
  mood: MoodValue;
  feelings: Feeling[];
  journalEntry: string;
  sleepHours: MockSleepRange;
}

export class MoodApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "MoodApiError";
  }
}

export interface MoodHistory {
  entries: MockMoodEntry[];
  aiQuotaRemaining: number;
}

export async function fetchMoodEntries(signal?: AbortSignal): Promise<MoodHistory> {
  const response = await fetch("/api/mood-entries?limit=11", {
    cache: "no-store",
    signal,
  });
  if (!response.ok) throw apiError(response.status, "load");

  const payload = (await response.json()) as MoodEntriesResponse;
  return {
    entries: payload.entries
      .map(mapMoodEntry)
      .sort((left, right) => left.entryDate.localeCompare(right.entryDate)),
    aiQuotaRemaining: payload.aiQuotaRemaining,
  };
}

export async function createMoodEntry(draft: MoodEntryDraft): Promise<MockMoodEntry> {
  const response = await fetch("/api/mood-entries", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      entryDate: draft.entryDate,
      mood: draft.mood,
      feelings: draft.feelings,
      journalEntry: draft.journalEntry,
      sleepRange: sleepRangeForChartValue(draft.sleepHours),
    }),
  });
  if (!response.ok) throw apiError(response.status, "submit");

  const payload = (await response.json()) as MoodEntryCreatedResponse;
  return mapMoodEntry(payload.entry);
}

function mapMoodEntry(entry: MoodEntryResponse): MockMoodEntry {
  return {
    id: String(entry.id),
    entryDate: entry.entryDate,
    mood: entry.mood,
    feelings: entry.feelings,
    journalEntry: entry.journalEntry,
    sleepHours: SLEEP_CHART_VALUES[entry.sleepRange],
    // Absent (not `null`) on the create-entry response, since a
    // just-created entry can't have one yet — normalize both to `null`.
    aiRecommendation: entry.aiRecommendation ?? null,
  };
}

export type GenerateRecommendationsResult =
  | { status: "ready"; recommendation: AiRecommendation }
  | { status: "quota_exhausted" }
  | { status: "unavailable" };

export async function generateMoodRecommendations(
  moodEntryId: string,
): Promise<GenerateRecommendationsResult> {
  const response = await fetch(`/api/mood-entries/${moodEntryId}/recommendations`, {
    method: "POST",
  });
  if (!response.ok) throw apiError(response.status, "recommend");

  return (await response.json()) as GenerateRecommendationsResult;
}

function sleepRangeForChartValue(value: MockSleepRange): SleepRange {
  const range = SLEEP_RANGES.find((candidate) => SLEEP_CHART_VALUES[candidate] === value);
  if (!range) throw new Error("Unsupported sleep range");
  return range;
}

function apiError(status: number, operation: "load" | "submit" | "recommend") {
  if (status === 400) {
    return new MoodApiError(status, "Please review your check-in and try again.");
  }
  if (status === 401) {
    return new MoodApiError(status, "Your session has expired. Please sign in again.");
  }
  if (status === 409) {
    return new MoodApiError(status, "You already logged a mood for today.");
  }
  if (operation === "recommend") {
    return new MoodApiError(status, "AI suggestions aren't available right now. Please try again later.");
  }
  return new MoodApiError(
    status,
    operation === "load"
      ? "We couldn't load your mood history. Please try again."
      : "We couldn't save your check-in. Please try again.",
  );
}
