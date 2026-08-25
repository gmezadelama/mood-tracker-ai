import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Home from "./page";

describe("Home", () => {
  it("renders the main mood dashboard sections", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { name: "How are you feeling today?" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Very Happy")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "I’m feeling" })).toBeInTheDocument();
    expect(screen.getByText("Reflection of the day")).toBeInTheDocument();
    expect(screen.getByText("Average Mood")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Mood and sleep trends" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Open profile menu" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", {
        name: "Mood and sleep chart. Scroll horizontally to view earlier entries.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("list", { name: "Recent mood and sleep history" }),
    ).toHaveTextContent("March 31, 2025: Sad mood and 5-6 hours of sleep.");
    expect(screen.getByText("Same as the previous 5 check-ins")).toBeInTheDocument();
    expect(screen.getByText("Increase from the previous 5 check-ins")).toBeInTheDocument();
  });
});
