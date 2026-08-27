import { z } from "zod";

// Recommended bounds from the product spec: small enough that the feature
// stays a light-touch enhancement, never a wall of generated text.
export const AI_ACTIVITIES_MIN = 2;
export const AI_ACTIVITIES_MAX = 3;
export const AI_PHRASES_MIN = 2;
export const AI_PHRASES_MAX = 3;

// A short sentence, not a paragraph — generous for "Take a slow walk
// outside and notice three things you can hear" while still rejecting
// anything essay-length.
export const AI_TEXT_MAX_LENGTH = 120;

const shortText = z.string().trim().min(1).max(AI_TEXT_MAX_LENGTH);

// Validates the model's structured output. Extra/nested keys are rejected
// (strictObject) so the persisted shape never silently grows beyond what
// the product actually reviewed.
export const moodRecommendationsSchema = z.strictObject({
  activities: z.array(shortText).min(AI_ACTIVITIES_MIN).max(AI_ACTIVITIES_MAX),
  phrases: z.array(shortText).min(AI_PHRASES_MIN).max(AI_PHRASES_MAX),
});

export type MoodRecommendations = z.infer<typeof moodRecommendationsSchema>;
