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
    expect(screen.getByText("Reflection of the day")).toBeInTheDocument();
    expect(screen.getByText("Average Mood")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Mood and sleep trends" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Open profile menu" }),
    ).toBeInTheDocument();
  });
});
