export const MOOD_VALUES = [-2, -1, 0, 1, 2] as const;

export type MoodValue = (typeof MOOD_VALUES)[number];

export const SLEEP_RANGES = [
  "ZERO_TO_TWO",
  "THREE_TO_FOUR",
  "FIVE_TO_SIX",
  "SEVEN_TO_EIGHT",
  "NINE_PLUS",
] as const;

export type SleepRange = (typeof SLEEP_RANGES)[number];

export const SLEEP_CHART_VALUES = {
  ZERO_TO_TWO: 1,
  THREE_TO_FOUR: 3.5,
  FIVE_TO_SIX: 5.5,
  SEVEN_TO_EIGHT: 7.5,
  NINE_PLUS: 9,
} as const satisfies Record<SleepRange, number>;

// Canonical selectable values from the supplied Frontend Mentor design.
export const FEELINGS = [
  "Joyful",
  "Down",
  "Anxious",
  "Calm",
  "Excited",
  "Frustrated",
  "Lonely",
  "Grateful",
  "Overwhelmed",
  "Motivated",
  "Irritable",
  "Peaceful",
  "Tired",
  "Hopeful",
  "Confident",
  "Stressed",
  "Content",
  "Disappointed",
  "Optimistic",
  "Restless",
] as const;

export type Feeling = (typeof FEELINGS)[number];
