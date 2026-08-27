import { afterEach, describe, expect, it, vi } from "vitest";

import { loadAiConfig } from "./config";

afterEach(() => {
  vi.unstubAllEnvs();
});

function stubEnv(overrides: Partial<Record<string, string>>) {
  vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", overrides.GOOGLE_GENERATIVE_AI_API_KEY ?? "test-key");
  vi.stubEnv("AI_DAILY_REQUEST_LIMIT", overrides.AI_DAILY_REQUEST_LIMIT ?? "8");
  vi.stubEnv("AI_MODEL", overrides.AI_MODEL ?? "gemini-3.6-flash");
}

describe("loadAiConfig", () => {
  it("returns the parsed config when every variable is present and valid", () => {
    stubEnv({});

    expect(loadAiConfig()).toEqual({ apiKey: "test-key", dailyLimit: 8, model: "gemini-3.6-flash" });
  });

  it("returns null when the API key is missing", () => {
    stubEnv({ GOOGLE_GENERATIVE_AI_API_KEY: "" });

    expect(loadAiConfig()).toBeNull();
  });

  it("returns null when the model is missing", () => {
    stubEnv({ AI_MODEL: "" });

    expect(loadAiConfig()).toBeNull();
  });

  it("returns null when the daily limit is not a positive integer", () => {
    stubEnv({ AI_DAILY_REQUEST_LIMIT: "0" });
    expect(loadAiConfig()).toBeNull();

    stubEnv({ AI_DAILY_REQUEST_LIMIT: "not-a-number" });
    expect(loadAiConfig()).toBeNull();
  });

  it("coerces a numeric-string daily limit", () => {
    stubEnv({ AI_DAILY_REQUEST_LIMIT: "12" });

    expect(loadAiConfig()?.dailyLimit).toBe(12);
  });
});
