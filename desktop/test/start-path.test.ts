import { describe, expect, it } from "vitest";
import { startPathFor } from "../src/main/start-path";

describe("startPathFor: the first page the app opens", () => {
  it("your map when you have a session", () => {
    expect(startPathFor(true)).toBe("/map");
  });

  it("Log in when you don't (not the sample student, whose map has no way to your own)", () => {
    expect(startPathFor(false)).toBe("/login");
  });
});
