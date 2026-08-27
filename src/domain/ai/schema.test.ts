import { describe, expect, it } from "vitest";

import { AI_TEXT_MAX_LENGTH, moodRecommendationsSchema } from "./schema";

const valid = {
  activities: ["Take a short walk outside", "Listen to a favorite song"],
  phrases: ["It's okay to feel this way.", "Small steps still count."],
};

describe("moodRecommendationsSchema", () => {
  it("accepts a well-formed payload within bounds", () => {
    expect(moodRecommendationsSchema.safeParse(valid).success).toBe(true);
  });

  it("trims whitespace from each entry", () => {
    const result = moodRecommendationsSchema.parse({
      activities: ["  Take a short walk  ", "Listen to music"],
      phrases: ["  Be gentle with yourself.  ", "This feeling can pass."],
    });

    expect(result.activities[0]).toBe("Take a short walk");
    expect(result.phrases[0]).toBe("Be gentle with yourself.");
  });

  it("rejects fewer than the minimum activities", () => {
    const result = moodRecommendationsSchema.safeParse({ ...valid, activities: ["Take a walk"] });
    expect(result.success).toBe(false);
  });

  it("rejects more than the maximum activities", () => {
    const result = moodRecommendationsSchema.safeParse({
      ...valid,
      activities: ["One", "Two", "Three", "Four"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects fewer than the minimum phrases", () => {
    const result = moodRecommendationsSchema.safeParse({ ...valid, phrases: ["Only one"] });
    expect(result.success).toBe(false);
  });

  it("rejects more than the maximum phrases", () => {
    const result = moodRecommendationsSchema.safeParse({
      ...valid,
      phrases: ["One", "Two", "Three", "Four"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty string entry", () => {
    const result = moodRecommendationsSchema.safeParse({ ...valid, activities: ["", "Listen to music"] });
    expect(result.success).toBe(false);
  });

  it("rejects a whitespace-only entry", () => {
    const result = moodRecommendationsSchema.safeParse({ ...valid, phrases: ["   ", "This feeling can pass."] });
    expect(result.success).toBe(false);
  });

  it("rejects text longer than the configured bound", () => {
    const result = moodRecommendationsSchema.safeParse({
      ...valid,
      activities: ["A".repeat(AI_TEXT_MAX_LENGTH + 1), "Listen to music"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects unexpected extra top-level fields", () => {
    const result = moodRecommendationsSchema.safeParse({ ...valid, confidence: 0.9 });
    expect(result.success).toBe(false);
  });

  it("rejects a non-array phrases field", () => {
    const result = moodRecommendationsSchema.safeParse({ ...valid, phrases: "Be gentle with yourself." });
    expect(result.success).toBe(false);
  });
});
