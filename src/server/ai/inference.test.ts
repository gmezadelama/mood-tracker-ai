import { beforeEach, describe, expect, it, vi } from "vitest";

const { loadAiConfig } = vi.hoisted(() => ({ loadAiConfig: vi.fn() }));
vi.mock("./config", () => ({ loadAiConfig }));

const { generateMoodInference } = vi.hoisted(() => ({ generateMoodInference: vi.fn() }));
vi.mock("./mood-inference", () => ({ generateMoodInference }));

const { AiGenerationError } = vi.hoisted(() => {
  class AiGenerationError extends Error {}
  return { AiGenerationError };
});
vi.mock("./gemini", () => ({ AiGenerationError }));

const { tryConsumeDailyQuota, getRemainingDailyQuota } = vi.hoisted(() => ({
  tryConsumeDailyQuota: vi.fn(),
  getRemainingDailyQuota: vi.fn(),
}));
vi.mock("./quota", () => ({ tryConsumeDailyQuota, getRemainingDailyQuota }));

const { moodInferenceRequestSchema, requestMoodInference } = await import("./inference");

beforeEach(() => {
  vi.clearAllMocks();
  loadAiConfig.mockReturnValue({ apiKey: "test", dailyLimit: 8, model: "gemini-test" });
  tryConsumeDailyQuota.mockResolvedValue(true);
  getRemainingDailyQuota.mockResolvedValue(7);
  generateMoodInference.mockResolvedValue({ mood: 1, feelings: ["Hopeful"] });
});

describe("mood inference request validation", () => {
  it("requires 10 trimmed characters and accepts exactly the reflection field", () => {
    expect(moodInferenceRequestSchema.safeParse({ reflection: "  too short  " }).success).toBe(false);
    expect(moodInferenceRequestSchema.safeParse({ reflection: "  enough detail here  " }).data).toEqual({ reflection: "enough detail here" });
    expect(moodInferenceRequestSchema.safeParse({ reflection: "enough detail", userId: 2 }).success).toBe(false);
  });
});

describe("requestMoodInference", () => {
  it("uses the configured shared quota and returns the authoritative remainder", async () => {
    await expect(requestMoodInference(4, "I feel calm and hopeful.")).resolves.toEqual({
      status: "ready",
      inference: { mood: 1, feelings: ["Hopeful"] },
      aiQuotaRemaining: 7,
    });
    expect(tryConsumeDailyQuota).toHaveBeenCalledWith(4, 8);
    expect(generateMoodInference).toHaveBeenCalledWith(
      { apiKey: "test", dailyLimit: 8, model: "gemini-test" },
      "I feel calm and hopeful.",
    );
  });

  it("does not touch quota or Gemini when AI configuration is unavailable", async () => {
    loadAiConfig.mockReturnValue(null);
    await expect(requestMoodInference(4, "I feel calm and hopeful.")).resolves.toEqual({ status: "unavailable", aiQuotaRemaining: 0 });
    expect(tryConsumeDailyQuota).not.toHaveBeenCalled();
    expect(generateMoodInference).not.toHaveBeenCalled();
  });

  it("does not call Gemini when shared quota is exhausted", async () => {
    tryConsumeDailyQuota.mockResolvedValue(false);
    await expect(requestMoodInference(4, "I feel calm and hopeful.")).resolves.toEqual({ status: "quota_exhausted", aiQuotaRemaining: 0 });
    expect(generateMoodInference).not.toHaveBeenCalled();
  });

  it("keeps the reserved quota consumed after provider or validation failure", async () => {
    generateMoodInference.mockRejectedValue(new AiGenerationError("invalid output"));
    getRemainingDailyQuota.mockResolvedValue(6);
    await expect(requestMoodInference(4, "I feel calm and hopeful.")).resolves.toEqual({ status: "unavailable", aiQuotaRemaining: 6 });
    expect(tryConsumeDailyQuota).toHaveBeenCalledTimes(1);
    expect(getRemainingDailyQuota).toHaveBeenCalledWith(4, 8);
  });
});
