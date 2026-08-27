import { NextResponse } from "next/server";

import { resolveCurrentUserId } from "@/server/current-user";
import { ValidationError } from "@/server/errors";
import { toErrorResponse } from "@/server/http";
import { moodInferenceRequestSchema, requestMoodInference } from "@/server/ai/inference";

export async function POST(request: Request) {
  try {
    const userId = await resolveCurrentUserId();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ValidationError("Invalid JSON body", []);
    }

    const parsed = moodInferenceRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        "Invalid mood inference request",
        parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      );
    }

    return NextResponse.json(await requestMoodInference(userId, parsed.data.reflection));
  } catch (error) {
    return toErrorResponse(error);
  }
}
