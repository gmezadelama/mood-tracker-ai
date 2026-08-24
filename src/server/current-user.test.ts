import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resolveCurrentUserId } from "./current-user";

interface FakeUserRow {
  id: number;
  clerkUserId: string;
  displayName: string;
}

const { users, resetUsers } = vi.hoisted(() => {
  const users: FakeUserRow[] = [];
  return { users, resetUsers: () => users.splice(0, users.length) };
});

let nextId = 1;

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return {
    ...actual,
    eq: (column: unknown, value: unknown) => ({ kind: "eq" as const, column, value }),
  };
});

vi.mock("@/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: (condition: { kind: "eq"; value: unknown }) => ({
          limit: async () =>
            users.filter((user) => user.clerkUserId === condition.value).slice(0, 1),
        }),
      }),
    }),
    insert: () => ({
      values: (value: { clerkUserId: string; displayName: string }) => ({
        onConflictDoNothing: () => ({
          returning: async () => {
            if (users.some((user) => user.clerkUserId === value.clerkUserId)) {
              return [];
            }
            const user: FakeUserRow = { id: nextId++, ...value };
            users.push(user);
            return [{ id: user.id }];
          },
        }),
      }),
    }),
  },
}));

const originalNodeEnv = process.env.NODE_ENV;

describe("resolveCurrentUserId", () => {
  beforeEach(() => {
    resetUsers();
    nextId = 1;
    vi.stubEnv("NODE_ENV", "test");
  });

  afterEach(() => {
    vi.stubEnv("NODE_ENV", originalNodeEnv ?? "test");
  });

  it("creates the development user on first use outside production", async () => {
    const id = await resolveCurrentUserId();

    expect(id).toBe(1);
    expect(users).toHaveLength(1);
  });

  it("reuses the same development user on repeated calls", async () => {
    const first = await resolveCurrentUserId();
    const second = await resolveCurrentUserId();

    expect(second).toBe(first);
    expect(users).toHaveLength(1);
  });

  it("rejects in production without creating or reusing any user", async () => {
    vi.stubEnv("NODE_ENV", "production");

    await expect(resolveCurrentUserId()).rejects.toMatchObject({
      name: "UnauthenticatedError",
    });
    expect(users).toHaveLength(0);
  });
});
