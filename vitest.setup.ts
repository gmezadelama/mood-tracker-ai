import { vi } from "vitest";

import "@testing-library/jest-dom/vitest";

// The real package throws when imported outside Next's "react-server"
// build condition, which Vitest doesn't apply.
vi.mock("server-only", () => ({}));

// Satisfies src/db/index.ts's startup guard when a module under test
// transitively imports the real db client. Tests always mock "@/db" or
// "@/server/mood-entries" before any query runs, so this is never used to
// reach a real database.
process.env.DATABASE_URL ??= "postgres://test:test@localhost:5432/test";
