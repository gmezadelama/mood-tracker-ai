import "server-only";

import { z } from "zod";

import type { MoodInference } from "@/domain/ai/schema";

import { loadAiConfig } from "./config";
import { AiGenerationError } from "./gemini";
import { generateMoodInference } from "./mood-inference";
import { getRemainingDailyQuota, tryConsumeDailyQuota } from "./quota";

export const MOOD_INFERENCE_MIN_LENGTH = 10;
export const MOOD_INFERENCE_MAX_LENGTH = 150;

export const moodInferenceRequestSchema = z.strictObject({
  reflection: z.string().trim().min(MOOD_INFERENCE_MIN_LENGTH).max(MOOD_INFERENCE_MAX_LENGTH),
});

export type MoodInferenceResult =
  | { status: "ready"; inference: MoodInference; aiQuotaRemaining: number }
  | { status: "quota_exhausted"; aiQuotaRemaining: 0 }
  | { status: "unavailable"; aiQuotaRemaining: number };

export async function requestMoodInference(
  userId: number,
  reflection: string,
): Promise<MoodInferenceResult> {
  const config = loadAiConfig();
  if (!config) return { status: "unavailable", aiQuotaRemaining: 0 };

  const reserved = await tryConsumeDailyQuota(userId, config.dailyLimit);
  if (!reserved) return { status: "quota_exhausted", aiQuotaRemaining: 0 };

  try {
    const inference = await generateMoodInference(config, reflection);
    const aiQuotaRemaining = await getRemainingDailyQuota(userId, config.dailyLimit);
    return { status: "ready", inference, aiQuotaRemaining };
  } catch (error) {
    if (error instanceof AiGenerationError) {
      const aiQuotaRemaining = await getRemainingDailyQuota(userId, config.dailyLimit);
      return { status: "unavailable", aiQuotaRemaining };
    }
    throw error;
  }
}
