// The design system's building blocks (docs/mobile.md §6): they say what the web's say,
// and they behave like buttons should.

import { fireEvent, render, screen } from "@testing-library/react-native";
import { Button } from "@/ui/Button";
import { DifficultyTag } from "@/ui/Difficulty";
import { Segmented } from "@/ui/Segmented";
import { StatusPill } from "@/ui/Status";
import { ThemeProvider } from "@/theme/theme";

// Testing Library 14 renders asynchronously: every render and press is awaited.
const wrap = (ui: React.ReactElement) => render(<ThemeProvider>{ui}</ThemeProvider>);

describe("Button", () => {
  it("calls onPress when pressed", async () => {
    const onPress = jest.fn();
    await wrap(<Button label="Save" onPress={onPress} />);
    await fireEvent.press(screen.getByRole("button", { name: "Save" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("does nothing when disabled, and says so to screen readers", async () => {
    const onPress = jest.fn();
    await wrap(<Button label="Save" onPress={onPress} disabled />);
    const button = screen.getByRole("button", { name: "Save" });
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
    expect(button).toBeDisabled();
  });
});

describe("the data marks", () => {
  it("names a status with the site's words", async () => {
    await wrap(<StatusPill status="shaky" />);
    expect(screen.getByText("Said shaky")).toBeTruthy();
  });

  it("names a difficulty as a word, not a pill", async () => {
    await wrap(<DifficultyTag level="medium" />);
    expect(screen.getByText("Medium")).toBeTruthy();
  });
});

describe("Segmented", () => {
  it("marks the chosen option and reports a new choice", async () => {
    const onChange = jest.fn();
    await wrap(<Segmented options={[{ value: "a", label: "Got it" }, { value: "b", label: "Partly" }]} value="a" onChange={onChange} />);
    expect(screen.getByRole("radio", { name: "Got it" })).toBeChecked();
    await fireEvent.press(screen.getByRole("radio", { name: "Partly" }));
    expect(onChange).toHaveBeenCalledWith("b");
  });
});
