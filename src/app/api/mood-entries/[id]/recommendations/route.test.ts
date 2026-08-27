import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ForbiddenError, NotFoundError, UnauthenticatedError } from "@/server/errors";

const { resolveCurrentUserId } = vi.hoisted(() => ({
  resolveCurrentUserId: vi.fn(),
}));

vi.mock("@/server/current-user", () => ({ resolveCurrentUserId }));

const { requestMoodRecommendations } = vi.hoisted(() => ({
  requestMoodRecommendations: vi.fn(),
}));

vi.mock("@/server/ai/recommendations", () => ({ requestMoodRecommendations }));

const { POST } = await import("./route");

function context(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("POST /api/mood-entries/[id]/recommendations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveCurrentUserId.mockResolvedValue(1);
  });

  it("returns 401 when identity cannot be resolved", async () => {
    resolveCurrentUserId.mockRejectedValue(new UnauthenticatedError());

    const response = await POST(new NextRequest("http://localhost/api/mood-entries/5/recommendations", { method: "POST" }), context("5"));

    expect(response.status).toBe(401);
    expect(requestMoodRecommendations).not.toHaveBeenCalled();
  });

  it("rejects a non-numeric id without calling the service", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/mood-entries/abc/recommendations", { method: "POST" }),
      context("abc"),
    );

    expect(response.status).toBe(400);
    expect(requestMoodRecommendations).not.toHaveBeenCalled();
  });

  it("returns 404 for another user's entry (or one that doesn't exist)", async () => {
    requestMoodRecommendations.mockRejectedValue(new NotFoundError("Mood entry not found"));

    const response = await POST(new NextRequest("http://localhost/api/mood-entries/5/recommendations", { method: "POST" }), context("5"));

    expect(response.status).toBe(404);
  });

  it("returns 403 for an entry outside the eligible window", async () => {
    requestMoodRecommendations.mockRejectedValue(new ForbiddenError("not eligible"));

    const response = await POST(new NextRequest("http://localhost/api/mood-entries/5/recommendations", { method: "POST" }), context("5"));

    expect(response.status).toBe(403);
  });

  it("returns the persisted or freshly generated recommendation", async () => {
    requestMoodRecommendations.mockResolvedValue({
      status: "ready",
      recommendation: { activities: ["Take a walk"], phrases: ["Be gentle with yourself."], createdAt: "2026-01-15T00:00:00.000Z" },
    });

    const response = await POST(new NextRequest("http://localhost/api/mood-entries/5/recommendations", { method: "POST" }), context("5"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.status).toBe("ready");
    expect(requestMoodRecommendations).toHaveBeenCalledWith(1, 5);
  });

  it("communicates quota exhaustion as a non-error result", async () => {
    requestMoodRecommendations.mockResolvedValue({ status: "quota_exhausted" });

    const response = await POST(new NextRequest("http://localhost/api/mood-entries/5/recommendations", { method: "POST" }), context("5"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.status).toBe("quota_exhausted");
  });

  it("communicates a provider/validation failure as a safe result", async () => {
    requestMoodRecommendations.mockResolvedValue({ status: "unavailable" });

    const response = await POST(new NextRequest("http://localhost/api/mood-entries/5/recommendations", { method: "POST" }), context("5"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.status).toBe("unavailable");
  });
});
