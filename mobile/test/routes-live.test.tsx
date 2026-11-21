// The real screens, signed in (the API faked): where a student with no goal lands.

import { screen } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import path from "node:path";

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(async () => "refresh-1"), // a stored session
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const state = {
  student: { id: "5", name: "Ada", email: "ada@example.com", joinedAt: "2026-11-21", hasPassword: true, goals: [] },
  goalIds: {},
  claims: [],
  checkIns: [],
  experiences: [],
  opened: [],
  promptTakes: [],
  messages: [],
  moreMessages: {},
  usage: { on: false, day: { usedPct: 0, resetsAt: "x" }, week: { usedPct: 0, resetsAt: "y" }, basic: null },
};
global.fetch = jest.fn(async (url: string) => {
  const body = String(url).endsWith("/auth/refresh") ? { accessToken: "a", refreshToken: "refresh-1" } : state;
  return { ok: true, status: 200, json: async () => body } as Response;
}) as unknown as typeof fetch;

it("sends a signed-in student with no goal to Start", async () => {
  await renderRouter(path.join(__dirname, "../src/app"), { initialUrl: "/" });
  expect(await screen.findByText("What are you learning?")).toBeTruthy();
});

it("sends the sort back to Start when there's no goal to sort for, without navigating mid-render", async () => {
  const errors = jest.spyOn(console, "error");
  await renderRouter(path.join(__dirname, "../src/app"), { initialUrl: "/start/sort" });
  expect(await screen.findByText("What are you learning?")).toBeTruthy();
  // React's warning for a navigation (a state change elsewhere) started while drawing.
  expect(errors.mock.calls.flat().join(" ")).not.toMatch(/Cannot update a component/);
  errors.mockRestore();
});
