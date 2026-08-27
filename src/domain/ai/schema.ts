import { z } from "zod";

import { FEELINGS, MOOD_VALUES, type MoodValue } from "@/domain/mood/constants";

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

// Gemini's structured-output API rejects numeric literal unions because the
// generated `anyOf` enum values are described as strings. The ordered mood
// scale is contiguous, so an integer range expresses the same canonical set
// while producing a provider-compatible JSON Schema.
const moodScaleSchema = z
  .number()
  .int()
  .min(MOOD_VALUES[0])
  .max(MOOD_VALUES[MOOD_VALUES.length - 1]) as z.ZodType<MoodValue>;

export const moodInferenceSchema = z.strictObject({
  mood: moodScaleSchema,
  feelings: z.array(z.enum(FEELINGS)).min(1).max(3).refine(
    (feelings) => new Set(feelings).size === feelings.length,
    "Feelings must be unique",
  ),
});

export type MoodInference = z.infer<typeof moodInferenceSchema>;
