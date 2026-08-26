import "server-only";

import { currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema";

import { UnauthenticatedError } from "./errors";

export interface AppUser {
  id: number;
  displayName: string;
  avatarUrl: string | null;
}

// Matches users.display_name's varchar(100) limit (src/db/schema.ts).
const DISPLAY_NAME_MAX_LENGTH = 100;

/**
 * Resolves the internal application user for the current request, creating
 * it on first authenticated use. This is the only place in the app that
 * talks to Clerk for identity — everything downstream works with the
 * internal `users.id`/profile fields instead, so swapping identity
 * providers later only touches this file.
 */
export async function getCurrentUser(): Promise<AppUser> {
  const clerkUser = await currentUser();
  if (!clerkUser) {
    throw new UnauthenticatedError();
  }

  const displayName = deriveDisplayName(clerkUser);
  const avatarUrl = clerkUser.hasImage ? clerkUser.imageUrl : null;

  return findOrCreateAppUser(clerkUser.id, displayName, avatarUrl);
}

export async function resolveCurrentUserId(): Promise<number> {
  return (await getCurrentUser()).id;
}

function deriveDisplayName(clerkUser: {
  fullName: string | null;
  firstName: string | null;
  username: string | null;
}): string {
  const name = clerkUser.fullName || clerkUser.firstName || clerkUser.username || "Mood Tracker User";
  return name.slice(0, DISPLAY_NAME_MAX_LENGTH);
}

async function findOrCreateAppUser(
  clerkUserId: string,
  displayName: string,
  avatarUrl: string | null,
): Promise<AppUser> {
  const existing = await findAppUser(clerkUserId);
  if (existing) return existing;

  const [created] = await db
    .insert(users)
    .values({ clerkUserId, displayName, avatarUrl })
    .onConflictDoNothing()
    .returning({ id: users.id, displayName: users.displayName, avatarUrl: users.avatarUrl });
  if (created) return created;

  // Lost a race with a concurrent request creating the same user first —
  // the unique constraint on clerk_user_id is the real guard; re-read
  // instead of surfacing the conflict to the caller.
  const afterRace = await findAppUser(clerkUserId);
  if (!afterRace) {
    throw new Error("Failed to synchronize the authenticated user");
  }
  return afterRace;
}

async function findAppUser(clerkUserId: string): Promise<AppUser | undefined> {
  const [existing] = await db
    .select({ id: users.id, displayName: users.displayName, avatarUrl: users.avatarUrl })
    .from(users)
    .where(eq(users.clerkUserId, clerkUserId))
    .limit(1);
  return existing;
}
