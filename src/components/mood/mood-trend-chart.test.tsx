import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MoodTrendChart } from "./mood-trend-chart";

describe("MoodTrendChart", () => {
  it("keeps the fixed-width chart inside a constrained horizontal scroll region", () => {
    const { container } = render(
      <MoodTrendChart
        entries={[
          {
            id: "1",
            entryDate: "2026-08-26",
            mood: 1,
            feelings: ["Calm"],
            journalEntry: "A good day",
            sleepHours: 5.5,
            aiRecommendation: null,
          },
        ]}
      />,
    );

    const region = screen.getByRole("region", { name: /mood and sleep chart/i });

    expect(region).toHaveClass("overflow-x-auto");
    expect(region.parentElement).toHaveClass("min-w-0", "flex-1");
    expect(container.firstElementChild).toHaveClass("min-w-0");
  });
});
