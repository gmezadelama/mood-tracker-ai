import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Home from "./page";

describe("Home", () => {
  it("identifies the bootstrapped project", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { name: "Mood Tracker AI" }),
    ).toBeInTheDocument();
  });
});
