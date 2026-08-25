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
