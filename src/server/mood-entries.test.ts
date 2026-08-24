import { beforeEach, describe, expect, it, vi } from "vitest";

import { createMoodEntry, listRecentMoodEntries } from "./mood-entries";

interface FakeRow {
  id: number;
  userId: number;
  entryDate: string;
  mood: number;
  feelings: string[];
  journalEntry: string;
  sleepRange: string;
  createdAt: Date;
  updatedAt: Date;
}

const { rows, resetRows, FakeNeonDbError } = vi.hoisted(() => {
  const rows: FakeRow[] = [];
  class FakeNeonDbError extends Error {
    code?: string;
    constructor(message: string, code?: string) {
      super(message);
      this.code = code;
    }
  }
  return {
    rows,
    resetRows: () => rows.splice(0, rows.length),
    FakeNeonDbError,
  };
});

let nextId = 1;

vi.mock("@neondatabase/serverless", () => ({ NeonDbError: FakeNeonDbError }));

// eq/desc are replaced with plain tagged objects so the in-memory fake below
// can interpret which column/value a query was built with, without
// reimplementing Drizzle's SQL builder.
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return {
    ...actual,
    eq: (column: unknown, value: unknown) => ({ kind: "eq" as const, column, value }),
    desc: (column: unknown) => ({ kind: "desc" as const, column }),
  };
});

vi.mock("@/db", () => ({
  db: {
    insert: () => ({
      values: (value: Omit<FakeRow, "id" | "createdAt" | "updatedAt">) => ({
        returning: async () => {
          const duplicate = rows.some(
            (row) => row.userId === value.userId && row.entryDate === value.entryDate,
          );
          if (duplicate) {
            // Matches drizzle-orm's neon-http driver, which wraps the real
            // NeonDbError in its own Error and chains it via `cause`
            // (confirmed against a live duplicate insert).
            const cause = new FakeNeonDbError(
              'duplicate key value violates unique constraint "mood_entries_user_id_entry_date_unique"',
              "23505",
            );
            throw new Error("Failed query: insert into mood_entries ...", { cause });
          }
          const row: FakeRow = {
            ...value,
            id: nextId++,
            createdAt: new Date("2026-01-01T00:00:00Z"),
            updatedAt: new Date("2026-01-01T00:00:00Z"),
          };
          rows.push(row);
          return [row];
        },
      }),
    }),
    select: () => ({
      from: () => ({
        where: (condition: { kind: "eq"; column: unknown; value: unknown }) => ({
          orderBy: () => ({
            limit: async (limit: number) => {
              const matched = rows.filter(
                (row) => condition.kind === "eq" && row.userId === condition.value,
              );
              const sorted = [...matched].sort((a, b) => (a.entryDate < b.entryDate ? 1 : -1));
              return sorted.slice(0, limit);
            },
          }),
        }),
      }),
    }),
  },
}));

const validInput = {
  entryDate: "2026-01-15",
  mood: 1 as const,
  feelings: ["Calm", "Grateful"] as ("Calm" | "Grateful")[],
  journalEntry: "A good day.",
  sleepRange: "SEVEN_TO_EIGHT" as const,
};

describe("createMoodEntry", () => {
  beforeEach(() => {
    resetRows();
    nextId = 1;
  });

  it("creates an entry for the resolved user", async () => {
    const entry = await createMoodEntry(1, validInput);

    expect(entry.entryDate).toBe("2026-01-15");
    expect(entry.mood).toBe(1);
    expect(entry.sleepRange).toBe("SEVEN_TO_EIGHT");
  });

  it("rejects a second entry for the same user and day", async () => {
    await createMoodEntry(1, validInput);

    await expect(createMoodEntry(1, validInput)).rejects.toMatchObject({
      name: "ConflictError",
    });
  });

  it("allows the same day for two different users", async () => {
    await createMoodEntry(1, validInput);

    await expect(createMoodEntry(2, validInput)).resolves.toMatchObject({
      entryDate: "2026-01-15",
    });
  });

  it("allows the same user to log a different day", async () => {
    await createMoodEntry(1, validInput);

    await expect(
      createMoodEntry(1, { ...validInput, entryDate: "2026-01-16" }),
    ).resolves.toMatchObject({ entryDate: "2026-01-16" });
  });
});

describe("listRecentMoodEntries", () => {
  beforeEach(() => {
    resetRows();
    nextId = 1;
  });

  it("only returns the resolved user's entries", async () => {
    await createMoodEntry(1, validInput);
    await createMoodEntry(2, { ...validInput, entryDate: "2026-01-16" });

    const entries = await listRecentMoodEntries(1);

    expect(entries).toHaveLength(1);
    expect(entries[0].entryDate).toBe("2026-01-15");
  });

  it("orders entries by entryDate, most recent first", async () => {
    await createMoodEntry(1, { ...validInput, entryDate: "2026-01-10" });
    await createMoodEntry(1, { ...validInput, entryDate: "2026-01-20" });
    await createMoodEntry(1, { ...validInput, entryDate: "2026-01-15" });

    const entries = await listRecentMoodEntries(1);

    expect(entries.map((entry) => entry.entryDate)).toEqual([
      "2026-01-20",
      "2026-01-15",
      "2026-01-10",
    ]);
  });

  it("bounds the result to the FM trend-graph window even if a larger limit is requested", async () => {
    for (let day = 1; day <= 15; day++) {
      await createMoodEntry(1, { ...validInput, entryDate: `2026-02-${String(day).padStart(2, "0")}` });
    }

    const entries = await listRecentMoodEntries(1, 1000);

    expect(entries).toHaveLength(11);
  });

  it("clamps a limit below 1 up to at least 1", async () => {
    await createMoodEntry(1, validInput);

    const entries = await listRecentMoodEntries(1, 0);

    expect(entries).toHaveLength(1);
  });
});
