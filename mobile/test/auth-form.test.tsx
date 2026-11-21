// The Log in and Sign up form (docs/mobile.md §5): the web's words, the server's error shown
// under the form, and the student handed on when it works.

import { fireEvent, render, screen } from "@testing-library/react-native";
import { AuthForm } from "@/auth/AuthForm";
import { signIn } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { ThemeProvider } from "@/theme/theme";

jest.mock("@/lib/auth", () => ({ signIn: jest.fn() }));
jest.mock("@/lib/google", () => ({ signInWithGoogle: jest.fn() }));

const STUDENT = { id: "5", name: "Ada", email: "ada@example.com", joinedAt: "2026-11-21", hasPassword: true, goals: [] };
const show = (mode: "login" | "signup", onSignedIn = jest.fn()) =>
  render(
    <ThemeProvider>
      <AuthForm mode={mode} onSignedIn={onSignedIn} onSwitch={jest.fn()} />
    </ThemeProvider>,
  );

beforeEach(() => jest.mocked(signIn).mockReset());

it("logs in with the email and password typed, and hands on the student", async () => {
  jest.mocked(signIn).mockResolvedValue(STUDENT);
  const onSignedIn = jest.fn();
  await show("login", onSignedIn);
  expect(screen.getByText("Welcome back")).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText("Email"), " Ada@Example.com ");
  await fireEvent.changeText(screen.getByLabelText("Password"), "correct horse");
  await fireEvent.press(screen.getByRole("button", { name: "Log in" }));
  expect(signIn).toHaveBeenCalledWith("login", { email: "Ada@Example.com", password: "correct horse" });
  expect(onSignedIn).toHaveBeenCalledWith(STUDENT);
});

it("shows the server's message when it refuses", async () => {
  jest.mocked(signIn).mockRejectedValue(new ApiError(401, "invalid_credentials", "That email and password don't match."));
  await show("login");
  await fireEvent.changeText(screen.getByLabelText("Email"), "ada@example.com");
  await fireEvent.changeText(screen.getByLabelText("Password"), "wrong");
  await fireEvent.press(screen.getByRole("button", { name: "Log in" }));
  expect(await screen.findByText("That email and password don't match.")).toBeTruthy();
});

it("asks for a name on sign-up and states the password rule", async () => {
  jest.mocked(signIn).mockResolvedValue(STUDENT);
  await show("signup");
  expect(screen.getByText("Start your map")).toBeTruthy();
  expect(screen.getByText("At least 8 characters.")).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText("Name"), "Ada");
  await fireEvent.changeText(screen.getByLabelText("Email"), "ada@example.com");
  await fireEvent.changeText(screen.getByLabelText("Password"), "correct horse");
  await fireEvent.press(screen.getByRole("button", { name: "Create account" }));
  expect(signIn).toHaveBeenCalledWith("register", { name: "Ada", email: "ada@example.com", password: "correct horse" });
});

it("keeps Log in disabled until both fields have something in them", async () => {
  await show("login");
  expect(screen.getByRole("button", { name: "Log in" })).toBeDisabled();
});
