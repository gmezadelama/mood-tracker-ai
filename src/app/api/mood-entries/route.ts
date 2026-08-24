import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { resolveCurrentUserId } from "@/server/current-user";
import { ValidationError } from "@/server/errors";
import { toErrorResponse } from "@/server/http";
import {
  createMoodEntry,
  listRecentMoodEntries,
  parseMoodEntryInput,
} from "@/server/mood-entries";

const MAX_LIMIT = 11;

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const userId = await resolveCurrentUserId();

    const parsedQuery = listQuerySchema.safeParse({
      limit: request.nextUrl.searchParams.get("limit") ?? undefined,
    });
    if (!parsedQuery.success) {
      return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 });
    }

    const entries = await listRecentMoodEntries(userId, parsedQuery.data.limit);
    return NextResponse.json({ entries });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await resolveCurrentUserId();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ValidationError("Invalid JSON body", []);
    }

    const input = parseMoodEntryInput(body);
    const entry = await createMoodEntry(userId, input);
    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
