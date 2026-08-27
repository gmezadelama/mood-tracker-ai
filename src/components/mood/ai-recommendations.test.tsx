import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fallbackSuggestionsForMood } from "@/domain/mood/fallback-suggestions";

import { AiRecommendations } from "./ai-recommendations";
import type { AiFeatureStatus, MockMoodEntry } from "./mock-data";

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

function entry(overrides: Partial<MockMoodEntry> = {}): MockMoodEntry {
  return {
    id: "1",
    entryDate: "2026-01-15",
    mood: 1,
    feelings: ["Calm"],
    journalEntry: "A good day.",
    sleepHours: 5.5,
    aiRecommendation: null,
    ...overrides,
  };
}

function renderPanel(overrides: {
  entries?: MockMoodEntry[];
  aiQuotaRemaining?: number;
  aiStatus?: AiFeatureStatus;
  onRecommendationReady?: (entryId: string, recommendation: unknown) => void;
  onQuotaConsumed?: () => void;
} = {}) {
  const onRecommendationReady = overrides.onRecommendationReady ?? vi.fn();
  const onQuotaConsumed = overrides.onQuotaConsumed ?? vi.fn();
  const result = render(
    <AiRecommendations
      entries={overrides.entries ?? [entry()]}
      aiQuotaRemaining={overrides.aiQuotaRemaining ?? 5}
      aiStatus={overrides.aiStatus ?? "available"}
      onRecommendationReady={onRecommendationReady}
      onQuotaConsumed={onQuotaConsumed}
    />,
  );
  return { ...result, onRecommendationReady, onQuotaConsumed };
}

describe("AiRecommendations", () => {
  it("renders nothing when there are no eligible entries", () => {
    const { container } = renderPanel({ entries: [] });

    expect(container).toBeEmptyDOMElement();
  });

  it("shows mood-specific static fallback content when there's no persisted recommendation", () => {
    renderPanel({ entries: [entry({ mood: -2 })] });

    const fallback = fallbackSuggestionsForMood(-2);
    expect(screen.getByText("Based on your selected mood")).toBeInTheDocument();
    for (const activity of fallback.activities) {
      expect(screen.getByText(activity)).toBeInTheDocument();
    }
    for (const phrase of fallback.phrases) {
      expect(screen.getByText(phrase)).toBeInTheDocument();
    }
  });

  it("does not call the API just to render fallback content", () => {
    renderPanel();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows the generate control alongside fallback content when quota remains", () => {
    renderPanel();

    expect(screen.getByText("Based on your selected mood")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate personalized suggestions" })).toBeInTheDocument();
  });

  it.each([
    [2, "2 AI requests left today."],
    [1, "1 AI request left today."],
  ])("shows the low-quota notice with correct grammar at %s remaining", (remaining, message) => {
    renderPanel({ aiQuotaRemaining: remaining });

    expect(screen.getByText(message)).toBeInTheDocument();
    expect(screen.getByText("AI assistance resets tomorrow.")).toBeInTheDocument();
  });

  it("keeps quota invisible when at least three requests remain", () => {
    renderPanel({ aiQuotaRemaining: 3 });

    expect(screen.queryByText(/AI requests? left today/)).not.toBeInTheDocument();
  });

  it("shows a persisted AI recommendation instead of fallback content, labeled as AI-personalized", () => {
    renderPanel({
      entries: [entry({
        aiRecommendation: { activities: ["Take a short walk"], phrases: ["Be gentle with yourself."], createdAt: "2026-01-15T00:00:00.000Z" },
      })],
    });

    expect(screen.getByText("Personalized by AI")).toBeInTheDocument();
    expect(screen.getByText("Take a short walk")).toBeInTheDocument();
    expect(screen.getByText("Be gentle with yourself.")).toBeInTheDocument();
    expect(screen.queryByText("Based on your selected mood")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Generate personalized suggestions" })).not.toBeInTheDocument();
    const fallback = fallbackSuggestionsForMood(1);
    expect(screen.queryByText(fallback.activities[0])).not.toBeInTheDocument();
  });

  it("still shows fallback content, without a usable generate control, when quota is exhausted", () => {
    renderPanel({ aiQuotaRemaining: 0 });

    expect(screen.getByText("Based on your selected mood")).toBeInTheDocument();
    const fallback = fallbackSuggestionsForMood(1);
    expect(screen.getByText(fallback.activities[0])).toBeInTheDocument();
    expect(screen.getByText("AI suggestions are available again tomorrow.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Generate personalized suggestions" })).not.toBeInTheDocument();
  });

  it("shows the unavailable message, not the quota message, when the AI feature itself is unconfigured", () => {
    // aiQuotaRemaining is 0 in both cases server-side; aiStatus is what
    // distinguishes "misconfigured" from "genuinely exhausted".
    renderPanel({ aiQuotaRemaining: 0, aiStatus: "unavailable" });

    expect(
      screen.getByText("AI suggestions aren't available right now. Please try again later."),
    ).toBeInTheDocument();
    expect(screen.queryByText("AI suggestions are available again tomorrow.")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Generate personalized suggestions" })).not.toBeInTheDocument();
    const fallback = fallbackSuggestionsForMood(1);
    expect(screen.getByText(fallback.activities[0])).toBeInTheDocument();
  });

  it("shows a loading state while generation is pending, then replaces fallback with the AI result and reconciles quota", async () => {
    let resolveFetch!: (response: Response) => void;
    fetchMock.mockReturnValueOnce(new Promise((resolve) => { resolveFetch = resolve; }));
    const { onRecommendationReady, onQuotaConsumed } = renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "Generate personalized suggestions" }));

    const pending = screen.getByRole("button", { name: "Generating personalized suggestions…" });
    expect(pending).toBeDisabled();
    expect(pending).toHaveAttribute("aria-busy", "true");

    resolveFetch(jsonResponse({
      status: "ready",
      recommendation: { activities: ["Take a short walk"], phrases: ["Be gentle with yourself."], createdAt: "2026-01-15T00:00:00.000Z" },
    }));

    await waitFor(() =>
      expect(onRecommendationReady).toHaveBeenCalledWith("1", {
        activities: ["Take a short walk"],
        phrases: ["Be gentle with yourself."],
        createdAt: "2026-01-15T00:00:00.000Z",
      }),
    );
    expect(onQuotaConsumed).toHaveBeenCalledTimes(1);
  });

  it("still shows fallback content, plus the subtle quota message, when generation reports quota_exhausted — without reconciling quota", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ status: "quota_exhausted" }));
    const { onQuotaConsumed } = renderPanel({ aiQuotaRemaining: 1 });

    fireEvent.click(screen.getByRole("button", { name: "Generate personalized suggestions" }));

    expect(await screen.findByText("AI suggestions are available again tomorrow.")).toBeInTheDocument();
    const fallback = fallbackSuggestionsForMood(1);
    expect(screen.getByText(fallback.activities[0])).toBeInTheDocument();
    expect(onQuotaConsumed).not.toHaveBeenCalled();
  });

  it("still shows fallback content, plus a safe non-alarming message, on a provider failure — and reconciles quota", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ status: "unavailable" }));
    const { onQuotaConsumed } = renderPanel({ aiQuotaRemaining: 1 });

    fireEvent.click(screen.getByRole("button", { name: "Generate personalized suggestions" }));

    expect(
      await screen.findByText("AI suggestions aren't available right now. Please try again later."),
    ).toBeInTheDocument();
    const fallback = fallbackSuggestionsForMood(1);
    expect(screen.getByText(fallback.activities[0])).toBeInTheDocument();
    expect(onQuotaConsumed).toHaveBeenCalledTimes(1);
  });
});
