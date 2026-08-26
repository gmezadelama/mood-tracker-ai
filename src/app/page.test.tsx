import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import Home from "./page";

afterEach(cleanup);

describe("Home", () => {
  it("renders the dashboard in the no-check-in state", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { name: "How are you feeling today?" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Log today's mood" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "I’m feeling" })).not.toBeInTheDocument();
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

  it("validates each step and submits a complete in-memory mood entry", () => {
    render(<Home />);

    fireEvent.click(screen.getByRole("button", { name: "Log today's mood" }));
    const dialog = screen.getByRole("dialog", { name: "Log your mood." });

    fireEvent.click(within(dialog).getByRole("button", { name: "Continue" }));
    expect(within(dialog).getByRole("alert")).toHaveTextContent(
      "Please select a mood before continuing.",
    );

    fireEvent.click(within(dialog).getByRole("radio", { name: "Very Sad" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Continue" }));
    expect(within(dialog).getByText("How did you feel?")).toHaveFocus();

    for (const feeling of ["Joyful", "Calm", "Hopeful"]) {
      fireEvent.click(within(dialog).getByRole("checkbox", { name: feeling }));
    }
    fireEvent.click(within(dialog).getByRole("checkbox", { name: "Restless" }));
    expect(within(dialog).getByRole("alert")).toHaveTextContent(
      "You can only select a maximum of 3 tags.",
    );
    expect(within(dialog).getByRole("checkbox", { name: "Restless" })).not.toBeChecked();
    fireEvent.click(within(dialog).getByRole("button", { name: "Continue" }));
    expect(within(dialog).getByText("Write about your day...")).toHaveFocus();

    fireEvent.click(within(dialog).getByRole("button", { name: "Continue" }));
    expect(within(dialog).getByRole("alert")).toHaveTextContent(
      "Please write a short reflection before continuing.",
    );
    fireEvent.change(within(dialog).getByLabelText("Write about your day..."), {
      target: { value: "A difficult day, but I reached out for support." },
    });
    expect(within(dialog).getByText("47/150")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Continue" }));

    fireEvent.click(within(dialog).getByRole("button", { name: "Submit" }));
    expect(within(dialog).getByRole("alert")).toHaveTextContent(
      "Please enter how many hours you slept.",
    );
    fireEvent.click(within(dialog).getByRole("radio", { name: "5-6 hours" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Submit" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "I’m feeling" })).toBeInTheDocument();
    expect(screen.getByText("Very Sad")).toBeInTheDocument();
    expect(screen.getByText("#Joyful #Calm #Hopeful")).toBeInTheDocument();
    const history = screen.getByRole("list", { name: "Recent mood and sleep history" });
    expect(history).toHaveTextContent(
      "April 16, 2025: Very Sad mood and 5-6 hours of sleep.",
    );
    expect(within(history).getAllByRole("listitem")).toHaveLength(11);
    expect(screen.queryByRole("button", { name: "Log today's mood" })).not.toBeInTheDocument();
  });

  it("discards a canceled draft and allows reopening the flow", () => {
    render(<Home />);

    fireEvent.click(screen.getByRole("button", { name: "Log today's mood" }));
    fireEvent.click(screen.getByRole("radio", { name: "Happy" }));
    fireEvent.click(screen.getByRole("button", { name: "Close mood logging" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Log today's mood" }));
    expect(screen.getByRole("radio", { name: "Happy" })).not.toBeChecked();
  });
});
