import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ConflictError, UnauthenticatedError } from "@/server/errors";

const { resolveCurrentUserId } = vi.hoisted(() => ({
  resolveCurrentUserId: vi.fn(),
}));

vi.mock("@/server/current-user", () => ({ resolveCurrentUserId }));

const { createMoodEntry, listRecentMoodEntries } = vi.hoisted(() => ({
  createMoodEntry: vi.fn(),
  listRecentMoodEntries: vi.fn(),
}));

vi.mock("@/server/mood-entries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/mood-entries")>();
  return { ...actual, createMoodEntry, listRecentMoodEntries };
});

const { GET, POST } = await import("./route");

const validBody = {
  entryDate: "2026-01-15",
  mood: 1,
  feelings: ["Calm"],
  journalEntry: "A good day.",
  sleepRange: "SEVEN_TO_EIGHT",
};

function jsonRequest(url: string, body: unknown, method = "POST"): NextRequest {
  return new NextRequest(new URL(url, "http://localhost"), {
    method,
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("GET /api/mood-entries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveCurrentUserId.mockResolvedValue(1);
  });

  it("returns 401 when identity cannot be resolved", async () => {
    resolveCurrentUserId.mockRejectedValue(new UnauthenticatedError());

    const response = await GET(new NextRequest("http://localhost/api/mood-entries"));

    expect(response.status).toBe(401);
  });

  it("returns the current user's entries", async () => {
    listRecentMoodEntries.mockResolvedValue([{ id: 1, entryDate: "2026-01-15" }]);

    const response = await GET(new NextRequest("http://localhost/api/mood-entries"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.entries).toHaveLength(1);
    expect(listRecentMoodEntries).toHaveBeenCalledWith(1, undefined);
  });

  it("rejects a limit outside the bounded window", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/mood-entries?limit=50"),
    );

    expect(response.status).toBe(400);
    expect(listRecentMoodEntries).not.toHaveBeenCalled();
  });
});

describe("POST /api/mood-entries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveCurrentUserId.mockResolvedValue(1);
  });

  it("returns 401 when identity cannot be resolved", async () => {
    resolveCurrentUserId.mockRejectedValue(new UnauthenticatedError());

    const response = await POST(jsonRequest("http://localhost/api/mood-entries", validBody));

    expect(response.status).toBe(401);
    expect(createMoodEntry).not.toHaveBeenCalled();
  });

  it("creates a valid entry", async () => {
    createMoodEntry.mockResolvedValue({ id: 1, ...validBody });

    const response = await POST(jsonRequest("http://localhost/api/mood-entries", validBody));

    expect(response.status).toBe(201);
    expect(createMoodEntry).toHaveBeenCalledWith(1, validBody);
  });

  it("rejects an invalid mood value", async () => {
    const response = await POST(
      jsonRequest("http://localhost/api/mood-entries", { ...validBody, mood: 3 }),
    );

    expect(response.status).toBe(400);
    expect(createMoodEntry).not.toHaveBeenCalled();
  });

  it("rejects an unsupported feeling", async () => {
    const response = await POST(
      jsonRequest("http://localhost/api/mood-entries", { ...validBody, feelings: ["Ecstatic"] }),
    );

    expect(response.status).toBe(400);
  });

  it("rejects an unsupported sleep range", async () => {
    const response = await POST(
      jsonRequest("http://localhost/api/mood-entries", { ...validBody, sleepRange: "TEN_PLUS" }),
    );

    expect(response.status).toBe(400);
  });

  it("rejects a malformed calendar date", async () => {
    const response = await POST(
      jsonRequest("http://localhost/api/mood-entries", { ...validBody, entryDate: "01/15/2026" }),
    );

    expect(response.status).toBe(400);
  });

  it("rejects a body with an unexpected property like a client-supplied userId", async () => {
    const response = await POST(
      jsonRequest("http://localhost/api/mood-entries", { ...validBody, userId: 999 }),
    );

    expect(response.status).toBe(400);
    expect(createMoodEntry).not.toHaveBeenCalled();
  });

  it("rejects duplicate feelings", async () => {
    const response = await POST(
      jsonRequest("http://localhost/api/mood-entries", {
        ...validBody,
        feelings: ["Calm", "Calm"],
      }),
    );

    expect(response.status).toBe(400);
  });

  it("rejects a non-JSON body", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/mood-entries", {
        method: "POST",
        body: "not json",
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(400);
  });

  it("returns 409 when the day already has an entry", async () => {
    createMoodEntry.mockRejectedValue(new ConflictError("A mood entry already exists for that day"));

    const response = await POST(jsonRequest("http://localhost/api/mood-entries", validBody));

    expect(response.status).toBe(409);
  });
});
