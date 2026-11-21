import { describe, expect, it } from "vitest";
import { msUntilNext } from "../src/main/reminder-time";

// vitest.config.ts fixes the time zone to America/New_York, so these local times (and the
// daylight-saving day below) mean the same on every machine.
const H = 3_600_000;

describe("msUntilNext: when the daily reminder fires next", () => {
  it("later today when the time hasn't come yet", () => {
    expect(msUntilNext("19:00", new Date(2026, 10, 21, 18, 0))).toBe(1 * H);
  });

  it("tomorrow when it has already passed today", () => {
    expect(msUntilNext("19:00", new Date(2026, 10, 21, 19, 30))).toBe(23.5 * H);
  });

  it("tomorrow, not now, at exactly that minute (it just fired)", () => {
    expect(msUntilNext("19:00", new Date(2026, 10, 21, 19, 0))).toBe(24 * H);
  });

  it("follows the wall clock across a daylight-saving change", () => {
    // 8 March 2026: New York's clocks jump from 02:00 to 03:00. From 20:00 the evening
    // before to 19:00 that day is 22 real hours, not 23.
    expect(msUntilNext("19:00", new Date(2026, 2, 7, 20, 0))).toBe(22 * H);
  });
});
