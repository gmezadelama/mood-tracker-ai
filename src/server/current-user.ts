import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema";

import { UnauthenticatedError } from "./errors";

// Fixed, server-side identity — never read from the request — so a client
// can never supply an arbitrary userId. Stands in for Clerk until the auth
// phase lands; only this function's body changes when it does.
const DEV_CLERK_USER_ID = "dev-local-user";

/**
 * Resolves the internal application user id for the current request.
 *
 * There is no real authentication yet. Outside production this returns a
 * fixed local development user (created on first use); in production it
 * always rejects, since trusting nothing is safer than trusting a stand-in.
 */
export async function resolveCurrentUserId(): Promise<number> {
  if (process.env.NODE_ENV === "production") {
    throw new UnauthenticatedError(
      "Authentication is not yet implemented for this environment",
    );
  }

  return (await findOrCreateDevUser()).id;
}

async function findOrCreateDevUser(): Promise<{ id: number }> {
  const existing = await findDevUser();
  if (existing) return existing;

  const [created] = await db
    .insert(users)
    .values({ clerkUserId: DEV_CLERK_USER_ID, displayName: "Dev User" })
    .onConflictDoNothing()
    .returning({ id: users.id });
  if (created) return created;

  // Lost a race with a concurrent request that created it first.
  const afterRace = await findDevUser();
  if (!afterRace) {
    throw new Error("Failed to resolve the development user");
  }
  return afterRace;
}

async function findDevUser(): Promise<{ id: number } | undefined> {
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkUserId, DEV_CLERK_USER_ID))
    .limit(1);
  return existing;
}
