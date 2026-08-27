import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { aiQuota } from "@/db/schema";

// UTC calendar day, not the user's local day — matches the product's
// explicit "00:00 UTC reset" requirement.
export function todayUtcDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Atomically reserves one daily AI request for `userId`, if the daily
 * limit hasn't been reached yet. Returns `true` when the reservation
 * succeeded (the caller may now call Gemini) and `false` when the quota
 * is already exhausted for today.
 *
 * This is a single `INSERT ... ON CONFLICT (user_id, quota_date) DO
 * UPDATE ... WHERE consumed_count < limit` statement. Postgres resolves
 * `ON CONFLICT` under a row-level lock, so two concurrent requests for
 * the same user/day are serialized by the database itself — the second
 * one sees the first's committed increment before its own `WHERE` check
 * runs. When the WHERE condition is false, the UPDATE (and therefore the
 * RETURNING) simply produces no row, which is how "exhausted" is
 * detected here. No application-level locking is needed.
 */
export async function tryConsumeDailyQuota(
  userId: number,
  dailyLimit: number,
): Promise<boolean> {
  const quotaDate = todayUtcDate();

  const [row] = await db
    .insert(aiQuota)
    .values({ userId, quotaDate, consumedCount: 1 })
    .onConflictDoUpdate({
      target: [aiQuota.userId, aiQuota.quotaDate],
      set: { consumedCount: sql`${aiQuota.consumedCount} + 1` },
      setWhere: sql`${aiQuota.consumedCount} < ${dailyLimit}`,
    })
    .returning({ consumedCount: aiQuota.consumedCount });

  return row !== undefined;
}

export async function getRemainingDailyQuota(
  userId: number,
  dailyLimit: number,
): Promise<number> {
  const quotaDate = todayUtcDate();

  const [row] = await db
    .select({ consumedCount: aiQuota.consumedCount })
    .from(aiQuota)
    .where(and(eq(aiQuota.userId, userId), eq(aiQuota.quotaDate, quotaDate)))
    .limit(1);

  const consumed = row?.consumedCount ?? 0;
  return Math.max(0, dailyLimit - consumed);
}
