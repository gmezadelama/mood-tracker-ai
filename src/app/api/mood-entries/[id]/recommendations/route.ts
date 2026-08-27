import { NextResponse } from "next/server";
import { z } from "zod";

import { requestMoodRecommendations } from "@/server/ai/recommendations";
import { resolveCurrentUserId } from "@/server/current-user";
import { ValidationError } from "@/server/errors";
import { toErrorResponse } from "@/server/http";

const idParamSchema = z.coerce.number().int().positive();

export async function POST(
  _request: Request,
  { params }: RouteContext<"/api/mood-entries/[id]/recommendations">,
) {
  try {
    const userId = await resolveCurrentUserId();

    const { id } = await params;
    const parsedId = idParamSchema.safeParse(id);
    if (!parsedId.success) {
      throw new ValidationError("Invalid mood entry id", []);
    }

    const result = await requestMoodRecommendations(userId, parsedId.data);
    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
