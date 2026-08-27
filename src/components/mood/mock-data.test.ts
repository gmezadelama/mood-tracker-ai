import { describe, expect, it } from "vitest";

import { calculateMockAverages, type MockMood, type MockMoodEntry, type MockSleepRange } from "./mock-data";

const moods: MockMood[] = [-2, -1, 0, 1, 2];
const sleepRanges: MockSleepRange[] = [1, 3.5, 5.5, 7.5, 9];

function entries(size: number): MockMoodEntry[] {
  return Array.from({ length: size }, (_, index) => ({
    id: String(index + 1),
    entryDate: `2026-01-${String(index + 1).padStart(2, "0")}`,
    mood: moods[index % moods.length],
    feelings: ["Calm"],
    journalEntry: `Entry ${index + 1}`,
    sleepHours: sleepRanges[index % sleepRanges.length],
    aiRecommendation: null,
  }));
}

describe("calculateMockAverages", () => {
  it("returns an explicit empty state", () => {
    const averages = calculateMockAverages([]);

    expect(averages.mood.value).toBe("No data yet");
    expect(averages.sleep.value).toBe("No data yet");
    expect(averages.mood.comparison).toBe("Log your first check-in");
  });

  it.each([1, 4, 5, 6, 7, 8, 9])("waits for two complete periods when given %s entries", (size) => {
    const averages = calculateMockAverages(entries(size));

    expect(averages.mood.value).not.toContain("undefined");
    expect(averages.sleep.value).not.toContain("undefined");
    expect(averages.mood.comparison).toBe("Keep tracking to see trends");
    expect(averages.sleep.comparison).toBe("Keep tracking to see trends");
    expect(averages.mood.trend).toBe("same");
    expect(averages.sleep.trend).toBe("same");
  });

  it.each([10, 11])("compares complete five-entry periods for %s entries", (size) => {
    const averages = calculateMockAverages(entries(size));

    expect(averages.mood.value).toMatch(/Very Sad|Sad|Neutral|Happy|Very Happy/);
    expect(averages.sleep.value).toMatch(/Hours|hours/);
    expect(averages.mood.comparison).toBeUndefined();
  });

  it("uses the latest records when more than five are supplied", () => {
    const sampleEntries = entries(5).concat({
      ...entries(6)[5],
      id: "latest",
      mood: 2,
      sleepHours: 9,
    });

    expect(calculateMockAverages(sampleEntries).mood.value).toBeDefined();
  });
});
