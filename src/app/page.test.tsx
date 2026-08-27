import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HomeView } from "@/components/home-view";

vi.mock("@clerk/nextjs", () => ({
  UserButton: () => <button type="button" aria-label="Open profile menu" />,
}));

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function Home() {
  return <HomeView displayName="Lisa" />;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function localToday() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function apiEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: 42,
    entryDate: localToday(),
    mood: -2,
    feelings: ["Joyful", "Calm", "Hopeful"],
    journalEntry: "A difficult day, but I reached out for support.",
    sleepRange: "FIVE_TO_SIX",
    createdAt: "2026-01-15T12:00:00.000Z",
    updatedAt: "2026-01-15T12:00:00.000Z",
    ...overrides,
  };
}

async function renderEmptyDashboard() {
  fetchMock.mockResolvedValueOnce(jsonResponse({ entries: [], aiQuotaRemaining: 8, aiStatus: "available" }));
  render(<Home />);
  return screen.findByRole("button", { name: "Log today's mood" });
}

function completeDraft(dialog: HTMLElement) {
  fireEvent.click(within(dialog).getByRole("radio", { name: "Very Sad" }));
  fireEvent.click(within(dialog).getByRole("button", { name: "Continue" }));
  fireEvent.click(within(dialog).getByRole("checkbox", { name: "Joyful" }));
  fireEvent.click(within(dialog).getByRole("button", { name: "Continue" }));
  fireEvent.change(within(dialog).getByLabelText("Write about your day..."), {
    target: { value: "A difficult day, but I reached out for support." },
  });
  fireEvent.click(within(dialog).getByRole("button", { name: "Continue" }));
  fireEvent.click(within(dialog).getByRole("radio", { name: "5-6 hours" }));
}

describe("Home integration", () => {
  it("shows loading before rendering a real empty state without sample history", async () => {
    let resolveLoad!: (response: Response) => void;
    fetchMock.mockReturnValueOnce(new Promise((resolve) => { resolveLoad = resolve; }));

    render(<Home />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading your mood history");
    expect(screen.queryByText("March 31, 2025: Sad mood")).not.toBeInTheDocument();

    resolveLoad(jsonResponse({ entries: [] }));

    expect(await screen.findByRole("button", { name: "Log today's mood" })).toBeInTheDocument();
    expect(screen.getAllByText("No data yet")).toHaveLength(2);
    expect(screen.getByText(/No check-ins yet/)).toBeInTheDocument();
  });

  it("normalizes populated API data and prevents another same-day check-in", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ entries: [apiEntry()] }));

    render(<Home />);

    expect(await screen.findByRole("heading", { name: "I’m feeling" })).toBeInTheDocument();
    expect(screen.getAllByText("Very Sad")).not.toHaveLength(0);
    expect(screen.getAllByText("5-6 hours")).not.toHaveLength(0);
    expect(screen.queryByRole("button", { name: "Log today's mood" })).not.toBeInTheDocument();
  });

  it("shows a retryable initial-load failure without falling back to mock data", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ error: "failed" }, 500))
      .mockResolvedValueOnce(jsonResponse({ entries: [] }));

    render(<Home />);

    const retry = await screen.findByRole("button", { name: "Try again" });
    expect(screen.queryByText("March 31, 2025: Sad mood")).not.toBeInTheDocument();
    fireEvent.click(retry);

    expect(await screen.findByRole("button", { name: "Log today's mood" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("posts the transport payload without identity fields and updates from the server response", async () => {
    await renderEmptyDashboard();
    fetchMock.mockResolvedValueOnce(jsonResponse({ entry: apiEntry() }, 201));

    fireEvent.click(screen.getByRole("button", { name: "Log today's mood" }));
    const dialog = screen.getByRole("dialog", { name: "Log your mood." });
    completeDraft(dialog);
    fireEvent.click(within(dialog).getByRole("button", { name: "Submit" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    const [, options] = fetchMock.mock.calls[1];
    const payload = JSON.parse(String(options?.body));
    expect(payload).toEqual({
      entryDate: localToday(),
      mood: -2,
      feelings: ["Joyful"],
      journalEntry: "A difficult day, but I reached out for support.",
      sleepRange: "FIVE_TO_SIX",
    });
    expect(payload).not.toHaveProperty("userId");
    expect(payload).not.toHaveProperty("clerkUserId");
    expect(screen.getByRole("heading", { name: "I’m feeling" })).toBeInTheDocument();
  });

  it("disables duplicate submission while the POST is pending", async () => {
    await renderEmptyDashboard();
    let resolvePost!: (response: Response) => void;
    fetchMock.mockReturnValueOnce(new Promise((resolve) => { resolvePost = resolve; }));

    fireEvent.click(screen.getByRole("button", { name: "Log today's mood" }));
    const dialog = screen.getByRole("dialog", { name: "Log your mood." });
    completeDraft(dialog);
    fireEvent.click(within(dialog).getByRole("button", { name: "Submit" }));

    const saving = within(dialog).getByRole("button", { name: "Saving..." });
    expect(saving).toBeDisabled();
    expect(saving).toHaveAttribute("aria-busy", "true");
    fireEvent.click(saving);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    resolvePost(jsonResponse({ entry: apiEntry() }, 201));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it.each([
    [400, "Please review your check-in and try again."],
    [401, "Your session has expired. Please sign in again."],
    [500, "We couldn't save your check-in. Please try again."],
  ])("keeps the draft open after a %s submission error", async (status, message) => {
    await renderEmptyDashboard();
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: "server detail" }, status));

    fireEvent.click(screen.getByRole("button", { name: "Log today's mood" }));
    const dialog = screen.getByRole("dialog", { name: "Log your mood." });
    completeDraft(dialog);
    fireEvent.click(within(dialog).getByRole("button", { name: "Submit" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(message);
    expect(within(dialog).getByRole("radio", { name: "5-6 hours" })).toBeChecked();
    expect(within(dialog).getByRole("button", { name: "Submit" })).toBeEnabled();
  });

  it("reconciles persisted state after a same-day conflict without duplicating it", async () => {
    await renderEmptyDashboard();
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ error: "duplicate" }, 409))
      .mockResolvedValueOnce(jsonResponse({ entries: [apiEntry()] }));

    fireEvent.click(screen.getByRole("button", { name: "Log today's mood" }));
    const dialog = screen.getByRole("dialog", { name: "Log your mood." });
    completeDraft(dialog);
    fireEvent.click(within(dialog).getByRole("button", { name: "Submit" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "You already logged a mood for today.",
    );
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(screen.getAllByText("Very Sad")).toHaveLength(2);
  });

  it("discards a canceled draft and allows reopening the flow", async () => {
    await renderEmptyDashboard();

    fireEvent.click(screen.getByRole("button", { name: "Log today's mood" }));
    fireEvent.click(screen.getByRole("radio", { name: "Happy" }));
    fireEvent.click(screen.getByRole("button", { name: "Close mood logging" }));
    fireEvent.click(screen.getByRole("button", { name: "Log today's mood" }));

    expect(screen.getByRole("radio", { name: "Happy" })).not.toBeChecked();
  });

  it("keeps the manual path unchanged and never calls mood inference", async () => {
    await renderEmptyDashboard();
    fetchMock.mockResolvedValueOnce(jsonResponse({ entry: apiEntry() }, 201));

    fireEvent.click(screen.getByRole("button", { name: "Log today's mood" }));
    const dialog = screen.getByRole("dialog", { name: "Log your mood." });
    completeDraft(dialog);
    fireEvent.click(within(dialog).getByRole("button", { name: "Submit" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(fetchMock.mock.calls.some(([url]) => url === "/api/mood-inference")).toBe(false);
  });

  it("validates assisted reflection before calling AI and preserves it when returning from review", async () => {
    await renderEmptyDashboard();
    fetchMock.mockResolvedValueOnce(jsonResponse({
      status: "ready",
      inference: { mood: 1, feelings: ["Hopeful", "Calm"] },
      aiQuotaRemaining: 7,
    }));

    fireEvent.click(screen.getByRole("button", { name: "Log today's mood" }));
    fireEvent.click(screen.getByRole("button", { name: "Help me identify my mood" }));
    const reflection = screen.getByLabelText("Write about your day...");
    fireEvent.change(reflection, { target: { value: " too short " } });
    fireEvent.click(screen.getByRole("button", { name: "Find a mood that fits" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Add a little more");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fireEvent.change(reflection, { target: { value: "I feel hopeful but still a little tired." } });
    fireEvent.click(screen.getByRole("button", { name: "Find a mood that fits" }));

    expect(await screen.findByRole("heading", { name: "Here's what your check-in suggests" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Happy" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Hopeful" })).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByLabelText("Write about your day...")).toHaveValue("I feel hopeful but still a little tired.");
  });

  it("applies editable suggestions and saves the confirmed values through the existing mood API", async () => {
    await renderEmptyDashboard();
    fetchMock
      .mockResolvedValueOnce(jsonResponse({
        status: "ready",
        inference: { mood: 1, feelings: ["Hopeful", "Calm"] },
        aiQuotaRemaining: 7,
      }))
      .mockResolvedValueOnce(jsonResponse({ entry: apiEntry({ mood: 0, feelings: ["Calm", "Content"], journalEntry: "I feel hopeful but steady." }) }, 201));

    fireEvent.click(screen.getByRole("button", { name: "Log today's mood" }));
    fireEvent.click(screen.getByRole("button", { name: "Help me identify my mood" }));
    fireEvent.change(screen.getByLabelText("Write about your day..."), { target: { value: "I feel hopeful but steady." } });
    fireEvent.click(screen.getByRole("button", { name: "Find a mood that fits" }));
    await screen.findByRole("heading", { name: "Here's what your check-in suggests" });

    fireEvent.click(screen.getByRole("radio", { name: "Neutral" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Hopeful" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Content" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("radio", { name: "5-6 hours" }));
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    const payload = JSON.parse(String(fetchMock.mock.calls[2][1]?.body));
    expect(payload).toMatchObject({ mood: 0, feelings: ["Calm", "Content"], journalEntry: "I feel hopeful but steady." });
  });

  it("allows exactly one explicit retry, replaces the suggestion, and keeps the limit across back navigation", async () => {
    await renderEmptyDashboard();
    fetchMock
      .mockResolvedValueOnce(jsonResponse({
        status: "ready",
        inference: { mood: 2, feelings: ["Hopeful", "Confident"] },
        aiQuotaRemaining: 2,
      }))
      .mockResolvedValueOnce(jsonResponse({
        status: "ready",
        inference: { mood: 0, feelings: ["Calm", "Content"] },
        aiQuotaRemaining: 1,
      }));

    fireEvent.click(screen.getByRole("button", { name: "Log today's mood" }));
    fireEvent.click(screen.getByRole("button", { name: "Help me identify my mood" }));
    fireEvent.change(screen.getByLabelText("Write about your day..."), {
      target: { value: "I feel hopeful but would like another perspective." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Find a mood that fits" }));

    const retry = await screen.findByRole("button", { name: "Try another suggestion" });
    expect(screen.getByRole("radio", { name: "Very Happy" })).toBeChecked();
    expect(screen.getByText("2 AI requests left today.")).toBeInTheDocument();
    fireEvent.click(retry);

    const retryPending = screen.getByRole("button", { name: "Finding another suggestion..." });
    expect(retryPending).toBeDisabled();
    expect(retryPending).toHaveAttribute("aria-busy", "true");
    fireEvent.click(retryPending);
    expect(fetchMock.mock.calls.filter(([url]) => url === "/api/mood-inference")).toHaveLength(2);

    await waitFor(() => expect(screen.getByRole("radio", { name: "Neutral" })).toBeChecked());
    expect(screen.getByRole("checkbox", { name: "Content" })).toBeChecked();
    expect(screen.getByText("1 AI request left today.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Try another suggestion" })).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([url]) => url === "/api/mood-inference")).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("button", { name: "Return to suggestion" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Return to suggestion" }));
    expect(screen.queryByRole("button", { name: "Try another suggestion" })).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([url]) => url === "/api/mood-inference")).toHaveLength(2);

    fireEvent.click(screen.getByRole("radio", { name: "Happy" }));
    expect(screen.getByRole("radio", { name: "Happy" })).toBeChecked();
  });

  it("preserves the first valid suggestion when the one retry fails", async () => {
    await renderEmptyDashboard();
    fetchMock
      .mockResolvedValueOnce(jsonResponse({
        status: "ready",
        inference: { mood: 1, feelings: ["Hopeful", "Calm"] },
        aiQuotaRemaining: 2,
      }))
      .mockResolvedValueOnce(jsonResponse({ status: "unavailable", aiQuotaRemaining: 1 }));

    fireEvent.click(screen.getByRole("button", { name: "Log today's mood" }));
    fireEvent.click(screen.getByRole("button", { name: "Help me identify my mood" }));
    fireEvent.change(screen.getByLabelText("Write about your day..."), {
      target: { value: "I feel cautiously hopeful and mostly calm today." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Find a mood that fits" }));
    fireEvent.click(await screen.findByRole("button", { name: "Try another suggestion" }));

    expect(await screen.findByRole("status")).toHaveTextContent("You can still edit this suggestion and continue.");
    expect(screen.getByRole("radio", { name: "Happy" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Hopeful" })).toBeChecked();
    expect(screen.queryByRole("button", { name: "Try another suggestion" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
  });

  it("does not offer retry when the initial inference consumes the final shared request", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ entries: [], aiQuotaRemaining: 1, aiStatus: "available" }))
      .mockResolvedValueOnce(jsonResponse({
        status: "ready",
        inference: { mood: 1, feelings: ["Hopeful"] },
        aiQuotaRemaining: 0,
      }));
    render(<Home />);
    await screen.findByRole("button", { name: "Log today's mood" });

    fireEvent.click(screen.getByRole("button", { name: "Log today's mood" }));
    expect(screen.getByText("1 AI request left today.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Help me identify my mood" }));
    fireEvent.change(screen.getByLabelText("Write about your day..."), {
      target: { value: "I feel hopeful and calm after finishing my work." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Find a mood that fits" }));

    expect(await screen.findByRole("heading", { name: "Here's what your check-in suggests" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Try another suggestion" })).not.toBeInTheDocument();
    expect(screen.getByText("AI mood assistance will be back tomorrow.")).toBeInTheDocument();
  });

  it("propagates Feature 2 quota changes immediately to the Feature 1 panel", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({
        entries: [apiEntry({ entryDate: "2026-01-14" })],
        aiQuotaRemaining: 3,
        aiStatus: "available",
      }))
      .mockResolvedValueOnce(jsonResponse({
        status: "ready",
        inference: { mood: 1, feelings: ["Hopeful"] },
        aiQuotaRemaining: 2,
      }));
    render(<Home />);
    await screen.findByRole("button", { name: "Log today's mood" });

    fireEvent.click(screen.getByRole("button", { name: "Log today's mood" }));
    fireEvent.click(screen.getByRole("button", { name: "Help me identify my mood" }));
    fireEvent.change(screen.getByLabelText("Write about your day..."), {
      target: { value: "I feel hopeful and ready for a calmer afternoon." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Find a mood that fits" }));

    await screen.findByRole("heading", { name: "Here's what your check-in suggests" });
    expect(screen.getAllByText("2 AI requests left today.")).toHaveLength(2);
  });

  it("propagates Feature 1 quota changes immediately into an open Feature 2 dialog", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({
        entries: [apiEntry({ entryDate: "2026-01-14" })],
        aiQuotaRemaining: 3,
        aiStatus: "available",
      }))
      .mockResolvedValueOnce(jsonResponse({
        status: "ready",
        recommendation: {
          activities: ["Take a short walk"],
          phrases: ["Notice what helped today."],
          createdAt: "2026-01-15T00:00:00.000Z",
        },
      }));
    render(<Home />);
    await screen.findByRole("button", { name: "Log today's mood" });
    fireEvent.click(screen.getByRole("button", { name: "Log today's mood" }));

    fireEvent.click(screen.getByRole("button", { name: "Generate personalized suggestions" }));

    await screen.findByText("Personalized by AI");
    expect(screen.getAllByText("2 AI requests left today.")).toHaveLength(2);
  });

  it("disables duplicate inference requests and offers manual fallback after provider failure", async () => {
    await renderEmptyDashboard();
    let resolveInference!: (response: Response) => void;
    fetchMock.mockReturnValueOnce(new Promise((resolve) => { resolveInference = resolve; }));

    fireEvent.click(screen.getByRole("button", { name: "Log today's mood" }));
    fireEvent.click(screen.getByRole("button", { name: "Help me identify my mood" }));
    fireEvent.change(screen.getByLabelText("Write about your day..."), { target: { value: "I am uncertain and low energy." } });
    fireEvent.click(screen.getByRole("button", { name: "Find a mood that fits" }));

    const pending = screen.getByRole("button", { name: "Finding a mood that fits..." });
    expect(pending).toBeDisabled();
    expect(pending).toHaveAttribute("aria-busy", "true");
    fireEvent.click(pending);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    resolveInference(jsonResponse({ status: "unavailable", aiQuotaRemaining: 7 }));
    expect(await screen.findByRole("status")).toHaveTextContent("isn't available right now");
    fireEvent.click(screen.getByRole("button", { name: "Choose mood manually" }));
    expect(screen.getByRole("radio", { name: "Very Happy" })).toBeInTheDocument();
  });

  it("allows a fresh assisted attempt after returning to manual following a failed first inference", async () => {
    await renderEmptyDashboard();
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ status: "unavailable", aiQuotaRemaining: 7 }))
      .mockResolvedValueOnce(jsonResponse({
        status: "ready",
        inference: { mood: 1, feelings: ["Hopeful"] },
        aiQuotaRemaining: 6,
      }));

    fireEvent.click(screen.getByRole("button", { name: "Log today's mood" }));
    fireEvent.click(screen.getByRole("button", { name: "Help me identify my mood" }));
    fireEvent.change(screen.getByLabelText("Write about your day..."), { target: { value: "I am uncertain and low energy." } });
    fireEvent.click(screen.getByRole("button", { name: "Find a mood that fits" }));

    expect(await screen.findByRole("status")).toHaveTextContent("isn't available right now");
    fireEvent.click(screen.getByRole("button", { name: "Choose mood manually" }));

    // Re-entering assisted mode after abandoning a failed first attempt
    // must offer a genuinely fresh attempt, not a permanently disabled
    // control left over from the earlier failure.
    fireEvent.click(screen.getByRole("button", { name: "Help me identify my mood" }));
    fireEvent.change(screen.getByLabelText("Write about your day..."), {
      target: { value: "Actually, I feel a bit more hopeful now." },
    });
    const secondAttempt = screen.getByRole("button", { name: "Find a mood that fits" });
    expect(secondAttempt).toBeEnabled();
    fireEvent.click(secondAttempt);

    expect(await screen.findByRole("heading", { name: "Here's what your check-in suggests" })).toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([url]) => url === "/api/mood-inference")).toHaveLength(2);
  });

  it.each([
    [0, "available", "AI mood assistance will be back tomorrow."],
    [8, "unavailable", "AI mood assistance isn't available right now."],
  ])("keeps manual logging available for quota/status state %#", async (quota, aiStatus, message) => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ entries: [], aiQuotaRemaining: quota, aiStatus }));
    render(<Home />);
    await screen.findByRole("button", { name: "Log today's mood" });
    fireEvent.click(screen.getByRole("button", { name: "Log today's mood" }));

    expect(screen.getByText((content) => content.includes(message))).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Help me identify my mood" })).not.toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Happy" })).toBeInTheDocument();
  });
});
