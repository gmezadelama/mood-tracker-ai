import "server-only";

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";

import {
  AI_TEXT_MAX_LENGTH,
  moodRecommendationsSchema,
  type MoodRecommendations,
} from "@/domain/ai/schema";
import type { Feeling, MoodValue, SleepRange } from "@/domain/mood/constants";

import type { AiConfig } from "./config";

// Presentation-only labels, kept local to the prompt builder rather than
// imported from the client-owned mock-data module — the server's AI
// boundary shouldn't depend on UI copy.
const MOOD_LABELS: Record<MoodValue, string> = {
  [-2]: "very sad",
  [-1]: "sad",
  0: "neutral",
  1: "happy",
  2: "very happy",
};

const SLEEP_LABELS: Record<SleepRange, string> = {
  ZERO_TO_TWO: "0-2 hours",
  THREE_TO_FOUR: "3-4 hours",
  FIVE_TO_SIX: "5-6 hours",
  SEVEN_TO_EIGHT: "7-8 hours",
  NINE_PLUS: "9+ hours",
};

export interface AiEntryInput {
  mood: MoodValue;
  feelings: Feeling[];
  journalEntry: string;
  sleepRange: SleepRange;
}

// Thrown for both a failed provider call and output that fails schema
// validation — the product treats them the same way (quota stays
// consumed, nothing is persisted, a generic "unavailable" result goes
// back to the client). The original cause is kept for server-side logs
// only, never for the response.
export class AiGenerationError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "AiGenerationError";
  }
}

export async function generateMoodRecommendations(
  config: AiConfig,
  entry: AiEntryInput,
): Promise<MoodRecommendations> {
  const google = createGoogleGenerativeAI({ apiKey: config.apiKey });

  try {
    const { object } = await generateObject({
      model: google(config.model),
      schema: moodRecommendationsSchema,
      prompt: buildPrompt(entry),
    });
    return object;
  } catch (error) {
    throw new AiGenerationError("AI recommendation generation failed", { cause: error });
  }
}

function buildPrompt(entry: AiEntryInput): string {
  const feelings = entry.feelings.length > 0 ? entry.feelings.join(", ") : "none specified";

  return `You generate small, supportive suggestions for a personal mood-tracking app.

This app is not therapy and does not provide medical advice. Never imply otherwise.

The user's current check-in (this single entry only — you have no other history):
- Mood: ${MOOD_LABELS[entry.mood]}
- Feelings: ${feelings}
- Sleep: ${SLEEP_LABELS[entry.sleepRange]}
- Reflection: "${entry.journalEntry}"

Return JSON with two arrays:
- "activities": 2 to 3 short activity suggestions. Each must be small, ordinary, low-risk, achievable, and optional — e.g. a short walk, listening to music, a brief break, writing something down, light stretching, a few minutes outside, or messaging someone they trust. Never suggest medication, supplements, substances, extreme exercise, self-harm-related actions, diagnoses, or treatment/medical directives.
- "phrases": 2 to 3 short supportive phrases. Each must be gentle, plain, and non-diagnostic. Avoid therapy language, diagnosis, promises, claims of certainty about how the user feels, manipulative motivation, or toxic positivity.

If the reflection describes something distressing, stay supportive and neutral without positioning this app as therapy or a substitute for professional help.

Keep every activity and phrase under ${AI_TEXT_MAX_LENGTH} characters — short phrases, not paragraphs.`;
}
