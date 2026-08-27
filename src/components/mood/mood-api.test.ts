import { afterEach, describe, expect, it, vi } from "vitest";

import { createMoodEntry, fetchMoodEntries, generateMoodRecommendations, inferMood } from "./mood-api";

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
      aiQuotaRemaining: 4,
      aiStatus: "available",
    })));

    const { entries, aiQuotaRemaining, aiStatus } = await fetchMoodEntries();

    expect(entries.map((entry) => entry.entryDate)).toEqual(["2026-01-15", "2026-01-16"]);
    expect(entries.map((entry) => entry.sleepHours)).toEqual([1, 9]);
    expect(aiQuotaRemaining).toBe(4);
    expect(aiStatus).toBe("available");
  });

  it("passes through an unavailable AI status", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({
      entries: [],
      aiQuotaRemaining: 0,
      aiStatus: "unavailable",
    })));

    const { aiStatus } = await fetchMoodEntries();

    expect(aiStatus).toBe("unavailable");
  });

  it("defaults a missing aiRecommendation to null and passes through an existing one", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({
      entries: [
        apiEntry(1, "2026-01-15"),
        {
          ...apiEntry(2, "2026-01-16"),
          aiRecommendation: { activities: ["Take a walk"], phrases: ["Be gentle."], createdAt: "2026-01-16T00:00:00.000Z" },
        },
      ],
      aiQuotaRemaining: 5,
    })));

    const { entries } = await fetchMoodEntries();

    expect(entries[0].aiRecommendation).toBeNull();
    expect(entries[1].aiRecommendation).toEqual({
      activities: ["Take a walk"],
      phrases: ["Be gentle."],
      createdAt: "2026-01-16T00:00:00.000Z",
    });
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

describe("generateMoodRecommendations", () => {
  it("posts to the entry-scoped endpoint and returns a ready result", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({
      status: "ready",
      recommendation: { activities: ["Take a walk"], phrases: ["Be gentle."], createdAt: "2026-01-15T00:00:00.000Z" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateMoodRecommendations("42");

    expect(fetchMock).toHaveBeenCalledWith("/api/mood-entries/42/recommendations", { method: "POST" });
    expect(result.status).toBe("ready");
  });

  it("passes through a quota_exhausted result without throwing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ status: "quota_exhausted" })));

    const result = await generateMoodRecommendations("42");

    expect(result).toEqual({ status: "quota_exhausted" });
  });

  it("throws a safe error message on a non-2xx response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ error: "forbidden" }, 403)));

    await expect(generateMoodRecommendations("42")).rejects.toMatchObject({
      status: 403,
      message: "AI suggestions aren't available right now. Please try again later.",
    });
  });
});

describe("inferMood", () => {
  it("posts only the reflection to the product-specific endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({
      status: "ready",
      inference: { mood: 0, feelings: ["Calm"] },
      aiQuotaRemaining: 7,
    }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(inferMood("I feel calm and steady.")).resolves.toMatchObject({ status: "ready" });
    expect(fetchMock).toHaveBeenCalledWith("/api/mood-inference", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reflection: "I feel calm and steady." }),
    });
    const payload = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(payload).not.toHaveProperty("userId");
    expect(payload).not.toHaveProperty("history");
  });
});
