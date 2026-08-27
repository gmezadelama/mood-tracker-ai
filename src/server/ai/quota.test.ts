import { beforeEach, describe, expect, it, vi } from "vitest";

interface FakeQuotaRow {
  userId: number;
  quotaDate: string;
  consumedCount: number;
}

const { rows, resetRows } = vi.hoisted(() => {
  const rows = new Map<string, FakeQuotaRow>();
  return { rows, resetRows: () => rows.clear() };
});

function key(userId: number, quotaDate: string) {
  return `${userId}:${quotaDate}`;
}

// A minimal stand-in for Postgres's `INSERT ... ON CONFLICT ... DO UPDATE
// ... WHERE` behavior: reads and conditionally writes the same in-memory
// row with no `await` in between, which is what makes the real statement
// atomic under concurrent connections. This fake doesn't prove Postgres
// row-locking works — it proves `tryConsumeDailyQuota` correctly treats
// "no row returned" as exhausted and never lets the stored count exceed
// the limit across repeated/concurrent-shaped calls.
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return {
    ...actual,
    eq: (column: unknown, value: unknown) => ({ kind: "eq" as const, column, value }),
    and: (...conditions: unknown[]) => ({ kind: "and" as const, conditions }),
    sql: (_strings: TemplateStringsArray, ...values: unknown[]) => ({ __sqlValues: values }),
  };
});

vi.mock("@/db", () => ({
  db: {
    insert: () => ({
      values: (value: FakeQuotaRow) => ({
        onConflictDoUpdate: (config: { setWhere: { __sqlValues: unknown[] } }) => ({
          returning: async () => {
            const dailyLimit = config.setWhere.__sqlValues[1] as number;
            const rowKey = key(value.userId, value.quotaDate);
            const existing = rows.get(rowKey);

            if (!existing) {
              rows.set(rowKey, { ...value });
              return [{ consumedCount: value.consumedCount }];
            }
            if (existing.consumedCount < dailyLimit) {
              existing.consumedCount += 1;
              return [{ consumedCount: existing.consumedCount }];
            }
            return [];
          },
        }),
      }),
    }),
    select: () => ({
      from: () => ({
        where: (condition: { conditions: { value: unknown }[] }) => ({
          limit: async () => {
            const [userIdCond, dateCond] = condition.conditions;
            const existing = rows.get(key(userIdCond.value as number, dateCond.value as string));
            return existing ? [{ consumedCount: existing.consumedCount }] : [];
          },
        }),
      }),
    }),
  },
}));

const { getRemainingDailyQuota, todayUtcDate, tryConsumeDailyQuota } = await import("./quota");

describe("tryConsumeDailyQuota", () => {
  beforeEach(() => resetRows());

  it("reserves the first request of the day", async () => {
    await expect(tryConsumeDailyQuota(1, 5)).resolves.toBe(true);
  });

  it("allows exactly `dailyLimit` requests and blocks the next one", async () => {
    for (let i = 0; i < 5; i++) {
      await expect(tryConsumeDailyQuota(1, 5)).resolves.toBe(true);
    }

    await expect(tryConsumeDailyQuota(1, 5)).resolves.toBe(false);
  });

  it("tracks separate users independently", async () => {
    for (let i = 0; i < 5; i++) await tryConsumeDailyQuota(1, 5);

    await expect(tryConsumeDailyQuota(2, 5)).resolves.toBe(true);
  });

  it("never lets concurrent reservations exceed the limit", async () => {
    const results = await Promise.all(
      Array.from({ length: 20 }, () => tryConsumeDailyQuota(1, 5)),
    );

    expect(results.filter(Boolean)).toHaveLength(5);
    expect(rows.get(key(1, todayUtcDate()))?.consumedCount).toBe(5);
  });
});

describe("getRemainingDailyQuota", () => {
  beforeEach(() => resetRows());

  it("returns the full limit when nothing has been consumed today", async () => {
    await expect(getRemainingDailyQuota(1, 5)).resolves.toBe(5);
  });

  it("reflects consumed requests", async () => {
    await tryConsumeDailyQuota(1, 5);
    await tryConsumeDailyQuota(1, 5);

    await expect(getRemainingDailyQuota(1, 5)).resolves.toBe(3);
  });

  it("never returns a negative remainder", async () => {
    for (let i = 0; i < 6; i++) await tryConsumeDailyQuota(1, 5);

    await expect(getRemainingDailyQuota(1, 5)).resolves.toBe(0);
  });
});
