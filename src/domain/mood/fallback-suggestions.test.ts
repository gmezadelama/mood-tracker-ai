import { describe, expect, it } from "vitest";

import { MOOD_VALUES, type MoodValue } from "./constants";
import { fallbackSuggestionsForMood } from "./fallback-suggestions";

describe("fallbackSuggestionsForMood", () => {
  it.each(MOOD_VALUES)("returns exactly 2 activities and 2 phrases for mood %i", (mood) => {
    const suggestions = fallbackSuggestionsForMood(mood);

    expect(suggestions.activities).toHaveLength(2);
    expect(suggestions.phrases).toHaveLength(2);
  });

  it("returns mood-specific content, not a shared generic set", () => {
    const seen = new Set<string>();
    for (const mood of MOOD_VALUES) {
      const suggestions = fallbackSuggestionsForMood(mood);
      const key = [...suggestions.activities, ...suggestions.phrases].join("|");
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  it.each([
    [-2 as MoodValue, "Step outside for a few minutes"],
    [-1 as MoodValue, "Put on some music"],
    [0 as MoodValue, "Try something small that breaks up"],
    [1 as MoodValue, "Spend a little more time"],
    [2 as MoodValue, "Capture something about today"],
  ])("mood %i includes its canonical activity copy", (mood, expectedFragment) => {
    const suggestions = fallbackSuggestionsForMood(mood);
    expect(suggestions.activities.some((activity) => activity.includes(expectedFragment))).toBe(true);
  });
});
