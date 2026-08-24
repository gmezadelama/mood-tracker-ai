import "server-only";

import { NextResponse } from "next/server";

import { ConflictError, UnauthenticatedError, ValidationError } from "./errors";

export function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof ValidationError) {
    return NextResponse.json(
      { error: error.message, issues: error.issues },
      { status: 400 },
    );
  }
  if (error instanceof UnauthenticatedError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
  if (error instanceof ConflictError) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }

  // Never leak SQL errors, stack traces, or environment details to clients.
  console.error("Unhandled backend error:", error);
  return NextResponse.json(
    { error: "Something went wrong. Please try again." },
    { status: 500 },
  );
}
