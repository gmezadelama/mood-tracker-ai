import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

interface FakeUserRow {
  id: number;
  clerkUserId: string;
  displayName: string;
  avatarUrl: string | null;
}

const { rows, resetRows, currentUserMock, onInsertAttempt } = vi.hoisted(() => {
  const rows: FakeUserRow[] = [];
  return {
    rows,
    resetRows: () => rows.splice(0, rows.length),
    currentUserMock: vi.fn(),
    // Lets a test inject a "concurrent" row exactly when an insert is
    // attempted, simulating another request's write landing in between
    // this request's initial lookup and its own insert.
    onInsertAttempt: { current: null as (() => void) | null },
  };
});

let nextId = 1;

vi.mock("@clerk/nextjs/server", () => ({
  currentUser: currentUserMock,
}));

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
            rows
              .filter((row) => row.clerkUserId === condition.value)
              .slice(0, 1)
              .map(({ id, displayName, avatarUrl }) => ({ id, displayName, avatarUrl })),
        }),
      }),
    }),
    insert: () => ({
      values: (value: Omit<FakeUserRow, "id">) => ({
        onConflictDoNothing: () => ({
          returning: async () => {
            onInsertAttempt.current?.();
            onInsertAttempt.current = null;
            if (rows.some((row) => row.clerkUserId === value.clerkUserId)) {
              return [];
            }
            const row: FakeUserRow = { id: nextId++, ...value };
            rows.push(row);
            return [
              { id: row.id, displayName: row.displayName, avatarUrl: row.avatarUrl },
            ];
          },
        }),
      }),
    }),
  },
}));

const { getCurrentUser, resolveCurrentUserId } = await import("./current-user");

function mockClerkUser(overrides: {
  id?: string;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  username?: string | null;
  hasImage?: boolean;
  imageUrl?: string;
}) {
  currentUserMock.mockResolvedValue({
    id: "clerk_1",
    firstName: null,
    lastName: null,
    fullName: null,
    username: null,
    hasImage: false,
    imageUrl: "https://img.clerk.com/default",
    ...overrides,
  });
}

const originalNodeEnv = process.env.NODE_ENV;

describe("getCurrentUser", () => {
  beforeEach(() => {
    resetRows();
    nextId = 1;
    onInsertAttempt.current = null;
    currentUserMock.mockReset();
    vi.stubEnv("NODE_ENV", "test");
  });

  afterEach(() => {
    vi.stubEnv("NODE_ENV", originalNodeEnv ?? "test");
  });

  it("rejects an unauthenticated request without creating a user", async () => {
    currentUserMock.mockResolvedValue(null);

    await expect(getCurrentUser()).rejects.toMatchObject({ name: "UnauthenticatedError" });
    expect(rows).toHaveLength(0);
  });

  it("creates an application user on first authenticated use", async () => {
    mockClerkUser({ id: "clerk_1", fullName: "Ada Lovelace", hasImage: true, imageUrl: "https://img.clerk.com/ada" });

    const user = await getCurrentUser();

    expect(user).toEqual({ id: 1, displayName: "Ada Lovelace", avatarUrl: "https://img.clerk.com/ada" });
    expect(rows).toEqual([
      { id: 1, clerkUserId: "clerk_1", displayName: "Ada Lovelace", avatarUrl: "https://img.clerk.com/ada" },
    ]);
  });

  it("reuses the existing application user without inserting a duplicate", async () => {
    mockClerkUser({ id: "clerk_1", fullName: "Ada Lovelace" });
    await getCurrentUser();

    mockClerkUser({ id: "clerk_1", fullName: "Ada Lovelace" });
    const user = await getCurrentUser();

    expect(user.id).toBe(1);
    expect(rows).toHaveLength(1);
  });

  it("stays idempotent across repeated synchronization calls", async () => {
    mockClerkUser({ id: "clerk_1", fullName: "Ada Lovelace" });

    await getCurrentUser();
    await getCurrentUser();
    await getCurrentUser();

    expect(rows).toHaveLength(1);
  });

  it("resolves distinct application users for distinct Clerk identities", async () => {
    mockClerkUser({ id: "clerk_1", fullName: "Ada Lovelace" });
    const first = await getCurrentUser();

    mockClerkUser({ id: "clerk_2", fullName: "Grace Hopper" });
    const second = await getCurrentUser();

    expect(first.id).not.toBe(second.id);
    expect(rows).toHaveLength(2);
  });

  it("re-reads the existing row instead of surfacing a concurrent-creation conflict", async () => {
    // The initial lookup finds nothing, so an insert is attempted. Right as
    // that insert runs, a concurrent request's row "appears" — the insert
    // sees the conflict, onConflictDoNothing yields no returned row, and
    // the code must fall back to a second read to find it.
    mockClerkUser({ id: "clerk_1", fullName: "Ada Lovelace" });
    onInsertAttempt.current = () => {
      rows.push({ id: 1, clerkUserId: "clerk_1", displayName: "Ada Lovelace", avatarUrl: null });
    };

    const user = await getCurrentUser();

    expect(user).toEqual({ id: 1, displayName: "Ada Lovelace", avatarUrl: null });
    expect(rows).toHaveLength(1);
  });

  it("truncates a display name longer than the database's varchar(100) limit", async () => {
    mockClerkUser({ id: "clerk_1", fullName: "A".repeat(150) });

    const user = await getCurrentUser();

    expect(user.displayName).toHaveLength(100);
    expect(user.displayName).toBe("A".repeat(100));
  });

  it("falls back to a safe display name when Clerk has no name data", async () => {
    mockClerkUser({ id: "clerk_1", fullName: null, firstName: null, username: null });

    const user = await getCurrentUser();

    expect(user.displayName).toBe("Mood Tracker User");
  });

  it("prefers firstName, then username, before the generic fallback", async () => {
    mockClerkUser({ id: "clerk_1", fullName: null, firstName: "Ada", username: "ada99" });
    expect((await getCurrentUser()).displayName).toBe("Ada");

    resetRows();
    mockClerkUser({ id: "clerk_1", fullName: null, firstName: null, username: "ada99" });
    expect((await getCurrentUser()).displayName).toBe("ada99");
  });

  it("stores a null avatarUrl when Clerk has no uploaded image", async () => {
    mockClerkUser({ id: "clerk_1", fullName: "Ada Lovelace", hasImage: false });

    const user = await getCurrentUser();

    expect(user.avatarUrl).toBeNull();
  });

  it("behaves identically in production — no fixed development user bypass", async () => {
    vi.stubEnv("NODE_ENV", "production");
    mockClerkUser({ id: "clerk_1", fullName: "Ada Lovelace" });

    const user = await getCurrentUser();

    expect(user.displayName).toBe("Ada Lovelace");
    expect(rows.every((row) => row.clerkUserId !== "dev-local-user")).toBe(true);

    currentUserMock.mockResolvedValue(null);
    await expect(getCurrentUser()).rejects.toMatchObject({ name: "UnauthenticatedError" });
  });
});

describe("resolveCurrentUserId", () => {
  beforeEach(() => {
    resetRows();
    nextId = 1;
    onInsertAttempt.current = null;
    currentUserMock.mockReset();
    vi.stubEnv("NODE_ENV", "test");
  });

  afterEach(() => {
    vi.stubEnv("NODE_ENV", originalNodeEnv ?? "test");
  });

  it("returns just the internal application id", async () => {
    mockClerkUser({ id: "clerk_1", fullName: "Ada Lovelace" });

    await expect(resolveCurrentUserId()).resolves.toBe(1);
  });
});
