// The real screens in src/app, through Expo Router: which screen a student lands on.
// (Found on the emulator, 21 Nov 2026: signed out, the app looped forever on start.)

import { screen } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import path from "node:path";

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(async () => null), // no stored session: signed out
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

it("opens on Log in when signed out", async () => {
  await renderRouter(path.join(__dirname, "../src/app"), { initialUrl: "/" });
  expect(await screen.findByText("Welcome back")).toBeTruthy();
  expect(screen).toHavePathname("/login");
});

it("ignores a trellis://auth link that arrives when no sign-in is in progress", async () => {
  await renderRouter(path.join(__dirname, "../src/app"), { initialUrl: "/auth?code=" + "a".repeat(64) });
  expect(await screen.findByText("Welcome back")).toBeTruthy();
});
