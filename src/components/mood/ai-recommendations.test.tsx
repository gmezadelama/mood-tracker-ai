import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

  it("shows the generate control only when there's no existing recommendation and quota remains", () => {
    render(
      <AiRecommendations entries={[entry()]} aiQuotaRemaining={2} onRecommendationReady={vi.fn()} />,
    );

    expect(screen.getByRole("button", { name: "Get AI suggestions" })).toBeInTheDocument();
  });

  it("renders a persisted recommendation instead of a generate control", () => {
    render(
      <AiRecommendations
        entries={[entry({
          aiRecommendation: { activities: ["Take a short walk"], phrases: ["Be gentle with yourself."], createdAt: "2026-01-15T00:00:00.000Z" },
        })]}
        aiQuotaRemaining={5}
        onRecommendationReady={vi.fn()}
      />,
    );

    expect(screen.getByText("Take a short walk")).toBeInTheDocument();
    expect(screen.getByText("Be gentle with yourself.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Get AI suggestions" })).not.toBeInTheDocument();
  });

  it("shows the subtle quota message instead of a generate control when quota is exhausted", () => {
    render(
      <AiRecommendations entries={[entry()]} aiQuotaRemaining={0} onRecommendationReady={vi.fn()} />,
    );

    expect(screen.getByText("AI suggestions are available again tomorrow.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Get AI suggestions" })).not.toBeInTheDocument();
  });

  it("shows a loading state while generation is pending, then calls back with the result", async () => {
    let resolveFetch!: (response: Response) => void;
    fetchMock.mockReturnValueOnce(new Promise((resolve) => { resolveFetch = resolve; }));
    const onRecommendationReady = vi.fn();

    render(
      <AiRecommendations entries={[entry()]} aiQuotaRemaining={5} onRecommendationReady={onRecommendationReady} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Get AI suggestions" }));

    const pending = screen.getByRole("button", { name: "Generating suggestions…" });
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

  it("shows the subtle quota message when generation reports quota_exhausted", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ status: "quota_exhausted" }));

    render(
      <AiRecommendations entries={[entry()]} aiQuotaRemaining={1} onRecommendationReady={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Get AI suggestions" }));

    expect(await screen.findByText("AI suggestions are available again tomorrow.")).toBeInTheDocument();
  });

  it("shows a safe, non-alarming message on a provider failure", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ status: "unavailable" }));

    render(
      <AiRecommendations entries={[entry()]} aiQuotaRemaining={1} onRecommendationReady={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Get AI suggestions" }));

    expect(
      await screen.findByText("AI suggestions aren't available right now. Please try again later."),
    ).toBeInTheDocument();
  });
});
