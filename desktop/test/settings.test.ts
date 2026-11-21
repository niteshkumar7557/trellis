import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from "../src/main/settings";

const freshDir = () => mkdtempSync(join(tmpdir(), "trellis-settings-"));

describe("settings file", () => {
  it("gives the defaults when there is no file yet", () => {
    expect(loadSettings(freshDir())).toEqual(DEFAULT_SETTINGS);
  });

  it("reads back what it saved", () => {
    const dir = freshDir();
    const s = { bounds: { x: 10, y: 20, width: 1200, height: 800 }, reminder: { on: true, time: "21:00" } };
    saveSettings(dir, s);
    expect(loadSettings(dir)).toEqual(s);
  });

  it("never throws on a broken file; it falls back to the defaults", () => {
    const dir = freshDir();
    writeFileSync(join(dir, "settings.json"), "{ not json");
    expect(loadSettings(dir)).toEqual(DEFAULT_SETTINGS);
  });

  it("drops fields of the wrong shape instead of trusting them", () => {
    const dir = freshDir();
    writeFileSync(join(dir, "settings.json"), JSON.stringify({ bounds: "big", reminder: { on: "yes", time: "25:99" } }));
    expect(loadSettings(dir)).toEqual(DEFAULT_SETTINGS);
  });
});
