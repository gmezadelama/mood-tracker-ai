import "server-only";

import { z } from "zod";

// Matches @ai-sdk/google's own default lookup, so the provider and our
// config validation agree on where the key lives without us hardcoding it
// twice.
const aiConfigSchema = z.object({
  apiKey: z.string().min(1),
  dailyLimit: z.coerce.number().int().min(1),
  model: z.string().min(1),
});

export type AiConfig = z.infer<typeof aiConfigSchema>;

/**
 * Reads and validates the AI environment configuration. Returns `null`
 * instead of throwing when it's missing or malformed — Feature 1 must fail
 * safely (mood tracking keeps working) rather than crash a request, and
 * the caller decides how to represent "AI unavailable" to the client
 * without ever surfacing which variable or value was the problem.
 */
export function loadAiConfig(): AiConfig | null {
  const result = aiConfigSchema.safeParse({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    dailyLimit: process.env.AI_DAILY_REQUEST_LIMIT,
    model: process.env.AI_MODEL,
  });
  return result.success ? result.data : null;
}
