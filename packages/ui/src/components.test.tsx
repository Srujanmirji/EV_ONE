import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Button, buttonClasses } from "./button";
import { Checkbox, SelectField, TextField } from "./field";
import { EmptyState, ErrorState, Skeleton } from "./states";

afterEach(cleanup);

describe("Button", () => {
  it("defaults to type=button so it never submits a form by accident", () => {
    render(<Button>Save</Button>);
    expect(
      screen.getByRole("button", { name: "Save" }).getAttribute("type"),
    ).toBe("button");
  });

  it("announces and blocks while loading", () => {
    render(
      <Button loading loadingLabel="Saving…">
        Save
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Saving…" });
    expect(button.hasAttribute("disabled")).toBe(true);
    expect(button.getAttribute("aria-busy")).toBe("true");
  });

  it("meets the 44px touch-target minimum in every size", () => {
    expect(buttonClasses("primary", "md")).toContain("min-h-11");
    expect(buttonClasses("secondary", "lg")).toContain("min-h-12");
  });
});

describe("fields", () => {
  it("labels the input and links hint and error to it", () => {
    render(
      <TextField
        label="City"
        hint="Where the vehicle is"
        error="Enter a city"
        required
      />,
    );
    const input = screen.getByLabelText(/City/);
    expect(input.getAttribute("aria-invalid")).toBe("true");
    const describedBy =
      input.getAttribute("aria-describedby")?.split(" ") ?? [];
    const texts = describedBy.map(
      (id) => document.getElementById(id)?.textContent,
    );
    expect(texts).toEqual(["Where the vehicle is", "Enter a city"]);
    expect(input.hasAttribute("required")).toBe(true);
  });

  it("is valid with no error and no stray describedby", () => {
    render(<TextField label="Name" />);
    const input = screen.getByLabelText("Name");
    expect(input.hasAttribute("aria-invalid")).toBe(false);
    expect(input.hasAttribute("aria-describedby")).toBe(false);
  });

  it("labels selects", () => {
    render(
      <SelectField label="Vehicle type">
        <option>Car</option>
      </SelectField>,
    );
    expect(screen.getByLabelText("Vehicle type").tagName).toBe("SELECT");
  });

  it("renders consent checkboxes unchecked by default", () => {
    render(<Checkbox label="Share my number with the seller" />);
    const box = screen.getByLabelText<HTMLInputElement>(
      "Share my number with the seller",
    );
    expect(box.checked).toBe(false);
  });
});

describe("states", () => {
  it("empty is a polite status, error is an assertive alert", () => {
    render(
      <>
        <EmptyState title="No results">Try fewer filters.</EmptyState>
        <ErrorState title="Could not load">Try again.</ErrorState>
      </>,
    );
    expect(screen.getByRole("status")).toHaveProperty(
      "textContent",
      "No resultsTry fewer filters.",
    );
    expect(screen.getByRole("alert").textContent).toContain("Could not load");
  });

  it("skeleton announces loading once and hides its bars", () => {
    render(<Skeleton lines={4} label="Loading models" />);
    const status = screen.getByRole("status", { name: "Loading models" });
    expect(status.getAttribute("aria-busy")).toBe("true");
    expect(status.querySelectorAll('[aria-hidden="true"]')).toHaveLength(4);
  });
});
