import { beforeEach, describe, expect, it, vi } from "vitest";

import { UnauthenticatedError } from "@/server/errors";

const { resolveCurrentUserId } = vi.hoisted(() => ({ resolveCurrentUserId: vi.fn() }));
vi.mock("@/server/current-user", () => ({ resolveCurrentUserId }));

const { requestMoodInference } = vi.hoisted(() => ({ requestMoodInference: vi.fn() }));
vi.mock("@/server/ai/inference", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/ai/inference")>()),
  requestMoodInference,
}));

const { POST } = await import("./route");

function request(body: unknown) {
  return new Request("http://localhost/api/mood-inference", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/mood-inference", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveCurrentUserId.mockResolvedValue(7);
  });

  it("requires authentication before inference", async () => {
    resolveCurrentUserId.mockRejectedValue(new UnauthenticatedError());
    expect((await POST(request({ reflection: "I feel calm today." }))).status).toBe(401);
    expect(requestMoodInference).not.toHaveBeenCalled();
  });

  it.each([
    { reflection: " short " },
    { reflection: "A sufficiently long reflection", userId: 9 },
    { journalEntry: "A sufficiently long reflection" },
  ])("rejects invalid or excessive input without consuming quota %#", async (body) => {
    expect((await POST(request(body))).status).toBe(400);
    expect(requestMoodInference).not.toHaveBeenCalled();
  });

  it("passes only the authenticated user and trimmed reflection to the service", async () => {
    requestMoodInference.mockResolvedValue({
      status: "ready",
      inference: { mood: 0, feelings: ["Calm"] },
      aiQuotaRemaining: 7,
    });
    const response = await POST(request({ reflection: "  I feel calm and steady.  " }));
    expect(response.status).toBe(200);
    expect(requestMoodInference).toHaveBeenCalledWith(7, "I feel calm and steady.");
  });
});
