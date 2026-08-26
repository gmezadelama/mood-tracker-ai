import { afterEach, describe, expect, it, vi } from "vitest";

import { createMoodEntry, fetchMoodEntries } from "./mood-api";

afterEach(() => {
  vi.unstubAllGlobals();
});

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

function apiEntry(id: number, entryDate: string, sleepRange = "SEVEN_TO_EIGHT") {
  return {
    id,
    entryDate,
    mood: 1,
    feelings: ["Calm"],
    journalEntry: "A good day.",
    sleepRange,
    createdAt: "2026-01-15T12:00:00.000Z",
    updatedAt: "2026-01-15T12:00:00.000Z",
  };
}

describe("mood API mapping", () => {
  it("normalizes the descending API response into ascending UI history", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({
      entries: [
        apiEntry(2, "2026-01-16", "NINE_PLUS"),
        apiEntry(1, "2026-01-15", "ZERO_TO_TWO"),
      ],
    })));

    const entries = await fetchMoodEntries();

    expect(entries.map((entry) => entry.entryDate)).toEqual(["2026-01-15", "2026-01-16"]);
    expect(entries.map((entry) => entry.sleepHours)).toEqual([1, 9]);
  });

  it("maps chart sleep values back to categorical persistence values", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({
      entry: apiEntry(1, "2026-01-15", "FIVE_TO_SIX"),
    }, 201));
    vi.stubGlobal("fetch", fetchMock);

    await createMoodEntry({
      entryDate: "2026-01-15",
      mood: 0,
      feelings: ["Calm"],
      journalEntry: "A calm day.",
      sleepHours: 5.5,
    });

    const [, options] = fetchMock.mock.calls[0];
    expect(JSON.parse(String(options.body))).toMatchObject({ sleepRange: "FIVE_TO_SIX" });
  });
});
