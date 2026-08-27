import { beforeEach, describe, expect, it, vi } from "vitest";

interface FakeMoodEntryRow {
  id: number;
  userId: number;
  entryDate: string;
  mood: number;
  feelings: string[];
  journalEntry: string;
  sleepRange: string;
}

interface FakeAiRecommendationRow {
  moodEntryId: number;
  activities: string[];
  phrases: string[];
  createdAt: Date;
}

const { moodEntryRows, aiRecRows, resetRows } = vi.hoisted(() => {
  const moodEntryRows: FakeMoodEntryRow[] = [];
  const aiRecRows: FakeAiRecommendationRow[] = [];
  return {
    moodEntryRows,
    aiRecRows,
    resetRows: () => {
      moodEntryRows.splice(0, moodEntryRows.length);
      aiRecRows.splice(0, aiRecRows.length);
    },
  };
});

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return {
    ...actual,
    eq: (column: unknown, value: unknown) => ({ kind: "eq" as const, column, value }),
    and: (...conditions: unknown[]) => ({ kind: "and" as const, conditions }),
    inArray: (column: unknown, values: unknown[]) => ({ kind: "inArray" as const, column, values }),
    desc: (column: unknown) => ({ kind: "desc" as const, column }),
  };
});

vi.mock("@/db", async () => {
  const schema = await import("@/db/schema");

  function fieldFor(column: unknown): string {
    if (column === schema.moodEntries.id) return "id";
    if (column === schema.moodEntries.userId) return "userId";
    if (column === schema.aiRecommendations.moodEntryId) return "moodEntryId";
    throw new Error("Unexpected column referenced in fake query");
  }

  function matches(row: Record<string, unknown>, condition: { kind: string; column?: unknown; value?: unknown; values?: unknown[]; conditions?: unknown[] }): boolean {
    if (condition.kind === "and") {
      return (condition.conditions ?? []).every((c) => matches(row, c as typeof condition));
    }
    if (condition.kind === "eq") return row[fieldFor(condition.column)] === condition.value;
    if (condition.kind === "inArray") {
      return (condition.values ?? []).includes(row[fieldFor(condition.column)]);
    }
    return false;
  }

  function thenable(getRows: () => unknown[]): {
    then: (onFulfilled: (rows: unknown[]) => unknown, onRejected?: (error: unknown) => unknown) => Promise<unknown>;
    limit: (n: number) => ReturnType<typeof thenable>;
    orderBy: (comparator: unknown) => ReturnType<typeof thenable>;
  } {
    return {
      then: (onFulfilled, onRejected) => Promise.resolve(getRows()).then(onFulfilled, onRejected),
      limit: (n: number) => thenable(() => getRows().slice(0, n)),
      orderBy: () =>
        thenable(() =>
          [...getRows()].sort((a, b) =>
            (b as FakeMoodEntryRow).entryDate.localeCompare((a as FakeMoodEntryRow).entryDate),
          ),
        ),
    };
  }

  return {
    db: {
      select: () => ({
        from: (table: unknown) => ({
          where: (condition: Parameters<typeof matches>[1]) => {
            const source = table === schema.moodEntries ? moodEntryRows : aiRecRows;
            return thenable(() => source.filter((row) => matches(row as unknown as Record<string, unknown>, condition)));
          },
        }),
      }),
      insert: () => ({
        values: (value: Omit<FakeAiRecommendationRow, "createdAt">) => ({
          onConflictDoNothing: () => ({
            returning: async () => {
              if (aiRecRows.some((row) => row.moodEntryId === value.moodEntryId)) return [];
              const row: FakeAiRecommendationRow = { ...value, createdAt: new Date("2026-01-01T00:00:00Z") };
              aiRecRows.push(row);
              return [row];
            },
          }),
        }),
      }),
    },
  };
});

const { loadAiConfig } = vi.hoisted(() => ({ loadAiConfig: vi.fn() }));
vi.mock("./config", () => ({ loadAiConfig }));

const { generateMoodRecommendations, AiGenerationError } = vi.hoisted(() => {
  class AiGenerationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "AiGenerationError";
    }
  }
  return { generateMoodRecommendations: vi.fn(), AiGenerationError };
});
vi.mock("./gemini", () => ({ generateMoodRecommendations, AiGenerationError }));

const { tryConsumeDailyQuota, getRemainingDailyQuota } = vi.hoisted(() => ({
  tryConsumeDailyQuota: vi.fn(),
  getRemainingDailyQuota: vi.fn(),
}));
vi.mock("./quota", () => ({ tryConsumeDailyQuota, getRemainingDailyQuota }));

const { attachAiMetadata, requestMoodRecommendations } = await import("./recommendations");

const validRecommendations = {
  activities: ["Take a short walk", "Listen to music"],
  phrases: ["It's okay to feel this way.", "This moment will pass."],
};

function seedEntry(overrides: Partial<FakeMoodEntryRow>): FakeMoodEntryRow {
  const row: FakeMoodEntryRow = {
    id: 1,
    userId: 1,
    entryDate: "2026-01-15",
    mood: 1,
    feelings: ["Calm"],
    journalEntry: "A good day.",
    sleepRange: "SEVEN_TO_EIGHT",
    ...overrides,
  };
  moodEntryRows.push(row);
  return row;
}

beforeEach(() => {
  resetRows();
  vi.clearAllMocks();
  loadAiConfig.mockReturnValue({ apiKey: "test-key", dailyLimit: 5, model: "gemini-3.6-flash" });
  tryConsumeDailyQuota.mockResolvedValue(true);
  generateMoodRecommendations.mockResolvedValue(validRecommendations);
});

describe("requestMoodRecommendations — ownership", () => {
  it("rejects an entry that doesn't exist", async () => {
    await expect(requestMoodRecommendations(1, 999)).rejects.toMatchObject({ name: "NotFoundError" });
  });

  it("rejects another user's entry", async () => {
    seedEntry({ id: 1, userId: 2 });

    await expect(requestMoodRecommendations(1, 1)).rejects.toMatchObject({ name: "NotFoundError" });
  });

  it("accepts the owner's own entry", async () => {
    seedEntry({ id: 1, userId: 1 });

    await expect(requestMoodRecommendations(1, 1)).resolves.toMatchObject({ status: "ready" });
  });
});

describe("requestMoodRecommendations — eligibility window", () => {
  function seedFiveEntries() {
    for (let day = 1; day <= 5; day++) {
      seedEntry({ id: day, entryDate: `2026-01-0${day}` });
    }
  }

  it.each([
    [5, "current"],
    [4, "previous 1"],
    [3, "previous 2"],
    [2, "previous 3"],
  ])("allows entry id %i (%s)", async (id) => {
    seedFiveEntries();
    await expect(requestMoodRecommendations(1, id)).resolves.toMatchObject({ status: "ready" });
  });

  it("rejects an entry older than the previous 3", async () => {
    seedFiveEntries();
    await expect(requestMoodRecommendations(1, 1)).rejects.toMatchObject({ name: "ForbiddenError" });
  });
});

describe("requestMoodRecommendations — already generated", () => {
  it("returns the persisted recommendation without calling Gemini or consuming quota", async () => {
    seedEntry({ id: 1 });
    aiRecRows.push({ moodEntryId: 1, activities: ["Existing"], phrases: ["Already here."], createdAt: new Date("2026-01-01T00:00:00Z") });

    const result = await requestMoodRecommendations(1, 1);

    expect(result).toEqual({
      status: "ready",
      recommendation: { activities: ["Existing"], phrases: ["Already here."], createdAt: "2026-01-01T00:00:00.000Z" },
    });
    expect(generateMoodRecommendations).not.toHaveBeenCalled();
    expect(tryConsumeDailyQuota).not.toHaveBeenCalled();
  });
});

describe("requestMoodRecommendations — quota", () => {
  it("returns quota_exhausted without calling Gemini when reservation fails", async () => {
    seedEntry({ id: 1 });
    tryConsumeDailyQuota.mockResolvedValue(false);

    const result = await requestMoodRecommendations(1, 1);

    expect(result).toEqual({ status: "quota_exhausted" });
    expect(generateMoodRecommendations).not.toHaveBeenCalled();
    expect(aiRecRows).toHaveLength(0);
  });
});

describe("requestMoodRecommendations — configuration", () => {
  it("fails safely when AI configuration is missing, without touching quota", async () => {
    seedEntry({ id: 1 });
    loadAiConfig.mockReturnValue(null);

    const result = await requestMoodRecommendations(1, 1);

    expect(result).toEqual({ status: "unavailable" });
    expect(tryConsumeDailyQuota).not.toHaveBeenCalled();
  });
});

describe("requestMoodRecommendations — provider", () => {
  it("persists a successful, structurally valid generation", async () => {
    seedEntry({ id: 1 });

    const result = await requestMoodRecommendations(1, 1);

    expect(result).toEqual({
      status: "ready",
      recommendation: { ...validRecommendations, createdAt: "2026-01-01T00:00:00.000Z" },
    });
    expect(aiRecRows).toHaveLength(1);
  });

  it("consumes quota but persists nothing on a provider failure", async () => {
    seedEntry({ id: 1 });
    generateMoodRecommendations.mockRejectedValue(new AiGenerationError("provider down"));

    const result = await requestMoodRecommendations(1, 1);

    expect(result).toEqual({ status: "unavailable" });
    expect(tryConsumeDailyQuota).toHaveBeenCalledTimes(1);
    expect(aiRecRows).toHaveLength(0);
  });

  it("consumes quota but persists nothing when the model's output fails schema validation", async () => {
    // gemini.ts wraps both a provider-transport failure and a
    // schema-validation failure in the same AiGenerationError — the
    // product treats them identically, so this exercises the same path.
    seedEntry({ id: 1 });
    generateMoodRecommendations.mockRejectedValue(new AiGenerationError("invalid structured output"));

    const result = await requestMoodRecommendations(1, 1);

    expect(result).toEqual({ status: "unavailable" });
    expect(aiRecRows).toHaveLength(0);
  });
});

describe("requestMoodRecommendations — concurrency", () => {
  it("never persists two rows for simultaneous requests on the same entry", async () => {
    seedEntry({ id: 1 });

    const [first, second] = await Promise.all([
      requestMoodRecommendations(1, 1),
      requestMoodRecommendations(1, 1),
    ]);

    expect(first.status).toBe("ready");
    expect(second.status).toBe("ready");
    expect(aiRecRows).toHaveLength(1);
    if (first.status === "ready" && second.status === "ready") {
      expect(first.recommendation).toEqual(second.recommendation);
    }
  });
});

describe("attachAiMetadata", () => {
  it("attaches null for entries without a persisted recommendation", async () => {
    getRemainingDailyQuota.mockResolvedValue(3);

    const { entries, aiQuotaRemaining, aiStatus } = await attachAiMetadata(1, [
      { id: 1, entryDate: "2026-01-15", mood: 1, feelings: [], journalEntry: "", sleepRange: "SEVEN_TO_EIGHT", createdAt: "", updatedAt: "" },
    ]);

    expect(entries[0].aiRecommendation).toBeNull();
    expect(aiQuotaRemaining).toBe(3);
    expect(aiStatus).toBe("available");
  });

  it("attaches an existing recommendation regardless of remaining quota", async () => {
    getRemainingDailyQuota.mockResolvedValue(0);
    aiRecRows.push({ moodEntryId: 1, activities: ["Existing"], phrases: ["Already here."], createdAt: new Date("2026-01-01T00:00:00Z") });

    const { entries, aiQuotaRemaining } = await attachAiMetadata(1, [
      { id: 1, entryDate: "2026-01-15", mood: 1, feelings: [], journalEntry: "", sleepRange: "SEVEN_TO_EIGHT", createdAt: "", updatedAt: "" },
    ]);

    expect(entries[0].aiRecommendation).toEqual({
      activities: ["Existing"],
      phrases: ["Already here."],
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    expect(aiQuotaRemaining).toBe(0);
  });

  it("reports zero remaining quota and an unavailable status when AI configuration is missing", async () => {
    loadAiConfig.mockReturnValue(null);

    const { aiQuotaRemaining, aiStatus } = await attachAiMetadata(1, []);

    expect(aiQuotaRemaining).toBe(0);
    expect(aiStatus).toBe("unavailable");
    expect(getRemainingDailyQuota).not.toHaveBeenCalled();
  });
});
