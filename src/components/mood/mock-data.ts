export type MockMood = -2 | -1 | 0 | 1 | 2;
export type MockSleepRange = 1 | 3.5 | 5.5 | 7.5 | 9;

export interface MockMoodEntry {
  id: string;
  entryDate: string;
  mood: MockMood;
  feelings: string[];
  journalEntry: string;
  sleepHours: MockSleepRange;
}

export const currentEntry: MockMoodEntry = {
  id: "2025-04-15",
  entryDate: "2025-04-15",
  mood: 2,
  feelings: ["Grateful", "Optimistic"],
  journalEntry: "Woke up early and finally tackled a big project!",
  sleepHours: 9,
};

export const currentMoodQuote =
  "When your heart is full, share your light with the world.";

export const moodQuotes: Record<MockMood, readonly string[]> = {
  [-2]: [
    "You are stronger than you think; the storm will pass.",
    "It's okay to cry. Healing begins when you let your feelings flow.",
    "Even in darkness, a spark of hope can shine bright.",
    "This moment is tough, but you've overcome challenges before.",
    "A gentle step forward, no matter how small, is still progress.",
  ],
  [-1]: [
    "Pain is temporary, brighter days lie ahead.",
    "Each setback is a chance to grow and learn.",
    "One small positive thought can change your entire day.",
    "It's okay to rest; self-care isn't selfish.",
    "Healing takes time - be patient and kind to yourself.",
  ],
  0: [
    "A calm mind can find opportunity in every moment.",
    "Sometimes the greatest triumph is simply finding peace.",
    "Take a moment to breathe; every breath is a fresh start.",
    "Even an ordinary day can hold a pleasant surprise.",
    "Balance isn't found, it's created.",
  ],
  1: [
    "Happiness grows when it's shared with others.",
    "Celebrate even the small victories to make life extraordinary.",
    "Gratitude can turn what you have into enough.",
    "Keep smiling; your joy can be contagious.",
    "Where focus goes, energy flows - keep your focus on what lifts you.",
  ],
  2: [
    currentMoodQuote,
    "Savor the highs in life; they become precious memories.",
    "Joy multiplies when spread among friends.",
    "Trust your journey; you're in a beautiful place right now.",
    "Let your happiness ripple out and inspire others.",
  ],
};

export const recentEntries: MockMoodEntry[] = [
  {
    id: "2025-03-31",
    entryDate: "2025-03-31",
    mood: -1,
    feelings: ["Disappointed", "Frustrated"],
    journalEntry: "Got some bad news. Trying to process my emotions.",
    sleepHours: 5.5,
  },
  {
    id: "2025-04-02",
    entryDate: "2025-04-02",
    mood: 1,
    feelings: ["Excited", "Content"],
    journalEntry: "A good friend visited, which lifted my spirits a lot.",
    sleepHours: 7.5,
  },
  {
    id: "2025-04-04",
    entryDate: "2025-04-04",
    mood: -2,
    feelings: ["Overwhelmed", "Lonely"],
    journalEntry: "Feeling isolated. Need to talk to someone soon.",
    sleepHours: 3.5,
  },
  {
    id: "2025-04-06",
    entryDate: "2025-04-06",
    mood: 0,
    feelings: ["Irritable"],
    journalEntry: "Woke up grouchy, but it got better by evening.",
    sleepHours: 5.5,
  },
  {
    id: "2025-04-07",
    entryDate: "2025-04-07",
    mood: 1,
    feelings: ["Optimistic", "Confident"],
    journalEntry: "Good progress on personal goals today.",
    sleepHours: 7.5,
  },
  {
    id: "2025-04-09",
    entryDate: "2025-04-09",
    mood: 2,
    feelings: ["Joyful", "Excited", "Grateful"],
    journalEntry: "Woke up ready to tackle new challenges.",
    sleepHours: 9,
  },
  {
    id: "2025-04-10",
    entryDate: "2025-04-10",
    mood: -1,
    feelings: ["Lonely", "Anxious"],
    journalEntry: "Feeling a bit off. Hoping tomorrow is better.",
    sleepHours: 3.5,
  },
  {
    id: "2025-04-12",
    entryDate: "2025-04-12",
    mood: 0,
    feelings: ["Calm"],
    journalEntry: "Quiet day at home, reading and resting.",
    sleepHours: 7.5,
  },
  {
    id: "2025-04-13",
    entryDate: "2025-04-13",
    mood: 1,
    feelings: ["Optimistic", "Confident"],
    journalEntry: "Had a productive morning cleaning and organizing.",
    sleepHours: 7.5,
  },
  {
    id: "2025-04-14",
    entryDate: "2025-04-14",
    mood: -2,
    feelings: ["Down", "Tired"],
    journalEntry: "Rough night of sleep. Need support and rest.",
    sleepHours: 3.5,
  },
  currentEntry,
];

export const moodColors: Record<MockMood, string> = {
  [-2]: "#ff9b99",
  [-1]: "#b8b1ff",
  0: "#89caff",
  1: "#89e780",
  2: "#ffc97c",
};

export const moodLabels: Record<MockMood, string> = {
  [-2]: "Very Sad",
  [-1]: "Sad",
  0: "Neutral",
  1: "Happy",
  2: "Very Happy",
};

export const moodIconNames: Record<MockMood, string> = {
  [-2]: "very-sad",
  [-1]: "sad",
  0: "neutral",
  1: "happy",
  2: "very-happy",
};

export const sleepLabels: Record<MockSleepRange, string> = {
  1: "0-2 Hours",
  3.5: "3-4 Hours",
  5.5: "5-6 Hours",
  7.5: "7-8 Hours",
  9: "9+ Hours",
};

type Trend = "increase" | "decrease" | "same";

export interface MockAverage {
  value: string;
  trend: Trend;
}

function compare(current: number, previous: number): Trend {
  if (current > previous) return "increase";
  if (current < previous) return "decrease";
  return "same";
}

function mean(values: number[]) {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function closestSleepRange(value: number): MockSleepRange {
  const ranges = Object.keys(sleepLabels).map(Number) as MockSleepRange[];
  return ranges.reduce((closest, range) =>
    Math.abs(range - value) < Math.abs(closest - value) ? range : closest,
  );
}

export function calculateMockAverages(
  entries: MockMoodEntry[],
  excludedEntryId?: string,
): {
  mood: MockAverage;
  sleep: MockAverage;
} {
  const completedEntries = excludedEntryId
    ? entries.filter((entry) => entry.id !== excludedEntryId)
    : entries;
  const latest = completedEntries.slice(-5);
  const previous = completedEntries.slice(-10, -5);
  const latestMood = mean(latest.map((entry) => entry.mood));
  const previousMood = mean(previous.map((entry) => entry.mood));
  const latestSleep = mean(latest.map((entry) => entry.sleepHours));
  const previousSleep = mean(previous.map((entry) => entry.sleepHours));

  return {
    mood: {
      value: moodLabels[Math.round(latestMood) as MockMood],
      trend: compare(Math.round(latestMood), Math.round(previousMood)),
    },
    sleep: {
      value: sleepLabels[closestSleepRange(latestSleep)],
      trend: compare(latestSleep, previousSleep),
    },
  };
}

export const mockAverages = calculateMockAverages(recentEntries, currentEntry.id);
