import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fallbackSuggestionsForMood } from "@/domain/mood/fallback-suggestions";

import { AiRecommendations } from "./ai-recommendations";
import type { MockMoodEntry } from "./mock-data";

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

describe("AiRecommendations", () => {
  it("renders nothing when there are no eligible entries", () => {
    const { container } = render(
      <AiRecommendations entries={[]} aiQuotaRemaining={5} onRecommendationReady={vi.fn()} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("shows mood-specific static fallback content when there's no persisted recommendation", () => {
    render(
      <AiRecommendations entries={[entry({ mood: -2 })]} aiQuotaRemaining={2} onRecommendationReady={vi.fn()} />,
    );

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
    render(
      <AiRecommendations entries={[entry()]} aiQuotaRemaining={2} onRecommendationReady={vi.fn()} />,
    );

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows the generate control alongside fallback content when quota remains", () => {
    render(
      <AiRecommendations entries={[entry()]} aiQuotaRemaining={2} onRecommendationReady={vi.fn()} />,
    );

    expect(screen.getByText("Based on your selected mood")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate personalized suggestions" })).toBeInTheDocument();
  });

  it("shows a persisted AI recommendation instead of fallback content, labeled as AI-personalized", () => {
    render(
      <AiRecommendations
        entries={[entry({
          aiRecommendation: { activities: ["Take a short walk"], phrases: ["Be gentle with yourself."], createdAt: "2026-01-15T00:00:00.000Z" },
        })]}
        aiQuotaRemaining={5}
        onRecommendationReady={vi.fn()}
      />,
    );

    expect(screen.getByText("Personalized by AI")).toBeInTheDocument();
    expect(screen.getByText("Take a short walk")).toBeInTheDocument();
    expect(screen.getByText("Be gentle with yourself.")).toBeInTheDocument();
    expect(screen.queryByText("Based on your selected mood")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Generate personalized suggestions" })).not.toBeInTheDocument();
    const fallback = fallbackSuggestionsForMood(1);
    expect(screen.queryByText(fallback.activities[0])).not.toBeInTheDocument();
  });

  it("still shows fallback content, without a usable generate control, when quota is exhausted", () => {
    render(
      <AiRecommendations entries={[entry()]} aiQuotaRemaining={0} onRecommendationReady={vi.fn()} />,
    );

    expect(screen.getByText("Based on your selected mood")).toBeInTheDocument();
    const fallback = fallbackSuggestionsForMood(1);
    expect(screen.getByText(fallback.activities[0])).toBeInTheDocument();
    expect(screen.getByText("AI suggestions are available again tomorrow.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Generate personalized suggestions" })).not.toBeInTheDocument();
  });

  it("shows a loading state while generation is pending, then replaces fallback with the AI result", async () => {
    let resolveFetch!: (response: Response) => void;
    fetchMock.mockReturnValueOnce(new Promise((resolve) => { resolveFetch = resolve; }));
    const onRecommendationReady = vi.fn();

    render(
      <AiRecommendations entries={[entry()]} aiQuotaRemaining={5} onRecommendationReady={onRecommendationReady} />,
    );

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
  });

  it("still shows fallback content, plus the subtle quota message, when generation reports quota_exhausted", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ status: "quota_exhausted" }));

    render(
      <AiRecommendations entries={[entry()]} aiQuotaRemaining={1} onRecommendationReady={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Generate personalized suggestions" }));

    expect(await screen.findByText("AI suggestions are available again tomorrow.")).toBeInTheDocument();
    const fallback = fallbackSuggestionsForMood(1);
    expect(screen.getByText(fallback.activities[0])).toBeInTheDocument();
  });

  it("still shows fallback content, plus a safe non-alarming message, on a provider failure", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ status: "unavailable" }));

    render(
      <AiRecommendations entries={[entry()]} aiQuotaRemaining={1} onRecommendationReady={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Generate personalized suggestions" }));

    expect(
      await screen.findByText("AI suggestions aren't available right now. Please try again later."),
    ).toBeInTheDocument();
    const fallback = fallbackSuggestionsForMood(1);
    expect(screen.getByText(fallback.activities[0])).toBeInTheDocument();
  });
});
