import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { attachAiMetadata } from "@/server/ai/recommendations";
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

    // Additive-only enrichment (see src/server/ai/recommendations.ts):
    // folds each entry's persisted AI recommendation (if any) and the
    // user's remaining daily quota into this same response, so the
    // dashboard's one existing list fetch is enough to render AI state
    // too — no extra per-entry round trip.
    const { entries: enrichedEntries, aiQuotaRemaining } = await attachAiMetadata(userId, entries);
    return NextResponse.json({ entries: enrichedEntries, aiQuotaRemaining });
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
