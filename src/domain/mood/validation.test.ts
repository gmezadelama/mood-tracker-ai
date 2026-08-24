import { describe, expect, it } from "vitest";

import { JOURNAL_ENTRY_MAX_LENGTH } from "./constants";
import { moodEntryInputSchema } from "./validation";

const valid = {
  entryDate: "2026-01-15",
  mood: 1 as const,
  feelings: ["Calm", "Grateful"],
  journalEntry: "A good day.",
  sleepRange: "SEVEN_TO_EIGHT" as const,
};

describe("moodEntryInputSchema", () => {
  it("accepts a valid entry", () => {
    expect(moodEntryInputSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts an entry with no feelings selected", () => {
    expect(moodEntryInputSchema.safeParse({ ...valid, feelings: [] }).success).toBe(true);
  });

  it("rejects a mood value outside the fixed scale", () => {
    expect(moodEntryInputSchema.safeParse({ ...valid, mood: 3 }).success).toBe(false);
  });

  it("rejects a feeling outside the canonical vocabulary", () => {
    expect(
      moodEntryInputSchema.safeParse({ ...valid, feelings: ["Ecstatic"] }).success,
    ).toBe(false);
  });

  it("rejects more than three feelings", () => {
    expect(
      moodEntryInputSchema.safeParse({
        ...valid,
        feelings: ["Calm", "Grateful", "Joyful", "Excited"],
      }).success,
    ).toBe(false);
  });

  it("rejects a sleep range outside the fixed enum", () => {
    expect(
      moodEntryInputSchema.safeParse({ ...valid, sleepRange: "TEN_PLUS" }).success,
    ).toBe(false);
  });

  it("rejects a malformed calendar date", () => {
    expect(
      moodEntryInputSchema.safeParse({ ...valid, entryDate: "01/15/2026" }).success,
    ).toBe(false);
  });

  it("rejects a full timestamp where a calendar date is expected", () => {
    expect(
      moodEntryInputSchema.safeParse({
        ...valid,
        entryDate: "2026-01-15T23:30:00Z",
      }).success,
    ).toBe(false);
  });

  it("rejects an empty journal entry", () => {
    expect(moodEntryInputSchema.safeParse({ ...valid, journalEntry: "" }).success).toBe(false);
  });

  it("rejects a journal entry over the configured limit", () => {
    expect(
      moodEntryInputSchema.safeParse({
        ...valid,
        journalEntry: "a".repeat(JOURNAL_ENTRY_MAX_LENGTH + 1),
      }).success,
    ).toBe(false);
  });

  it("rejects duplicate feeling selections", () => {
    expect(
      moodEntryInputSchema.safeParse({ ...valid, feelings: ["Calm", "Calm"] }).success,
    ).toBe(false);
  });

  it("rejects unknown properties", () => {
    expect(
      moodEntryInputSchema.safeParse({ ...valid, userId: 999 }).success,
    ).toBe(false);
  });

  it("rejects a missing required field", () => {
    const withoutJournalEntry = {
      entryDate: valid.entryDate,
      mood: valid.mood,
      feelings: valid.feelings,
      sleepRange: valid.sleepRange,
    };
    expect(moodEntryInputSchema.safeParse(withoutJournalEntry).success).toBe(false);
  });
});
