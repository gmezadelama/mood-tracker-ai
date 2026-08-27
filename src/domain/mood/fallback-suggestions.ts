import type { MoodValue } from "./constants";

export interface MoodFallbackSuggestions {
  activities: readonly string[];
  phrases: readonly string[];
}

/**
 * Canonical, deterministic v1.0 product copy — not AI-generated, never
 * persisted, never randomized. Keyed by the same MoodValue used
 * everywhere else in the domain, so this never introduces a second mood
 * vocabulary to keep in sync.
 *
 * Exactly 2 activities + 2 phrases per mood, distinguishing this from an
 * AI recommendation (2-3 of each) at a glance.
 */
export const MOOD_FALLBACK_SUGGESTIONS: Record<MoodValue, MoodFallbackSuggestions> = {
  [-2]: {
    activities: [
      "Step outside for a few minutes and get some fresh air.",
      "Do something small and comforting that you usually enjoy.",
    ],
    phrases: [
      "It's okay to take today a little more slowly.",
      "A difficult day doesn't have to be a productive one.",
    ],
  },
  [-1]: {
    activities: [
      "Put on some music that fits the moment or helps you unwind.",
      "Take a short walk or spend a few quiet minutes outside.",
    ],
    phrases: [
      "Give yourself some room to have an off day.",
      "Small moments of comfort still count.",
    ],
  },
  0: {
    activities: [
      "Try something small that breaks up your usual routine.",
      "Take a few minutes to notice something you enjoyed today.",
    ],
    phrases: [
      "An ordinary day can still have worthwhile moments.",
      "You don't need every day to feel remarkable.",
    ],
  },
  1: {
    activities: [
      "Spend a little more time doing something you enjoyed today.",
      "Share a good moment from your day with someone you care about.",
    ],
    phrases: [
      "It's worth noticing what made today feel good.",
      "Enjoy the good moments without needing to make more of them.",
    ],
  },
  2: {
    activities: [
      "Capture something about today that you'd like to remember.",
      "Use some of that positive energy for something you enjoy.",
    ],
    phrases: [
      "This sounds like a moment worth appreciating.",
      "Let yourself enjoy what's going well today.",
    ],
  },
};

export function fallbackSuggestionsForMood(mood: MoodValue): MoodFallbackSuggestions {
  return MOOD_FALLBACK_SUGGESTIONS[mood];
}
