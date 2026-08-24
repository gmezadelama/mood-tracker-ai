import { z } from "zod";

import { FEELINGS, MOOD_VALUES, SLEEP_RANGES } from "./constants";

export const feelingSchema = z.enum(FEELINGS);
export const moodValueSchema = z.union(
  MOOD_VALUES.map((value) => z.literal(value)),
);
export const sleepRangeSchema = z.enum(SLEEP_RANGES);
