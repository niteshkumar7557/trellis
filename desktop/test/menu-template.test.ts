import { describe, expect, it } from "vitest";
import { goItems, SEARCH_SHORTCUT } from "../src/main/menu-template";

describe("the Go menu", () => {
  it("has the sidebar's pages, Map, Check-ins and Settings, on ⌘1 to ⌘3", () => {
    expect(goItems()).toEqual([
      { label: "Map", path: "/map", accelerator: "CmdOrCtrl+1" },
      { label: "Check-ins", path: "/check-ins", accelerator: "CmdOrCtrl+2" },
      { label: "Settings", path: "/settings", accelerator: "CmdOrCtrl+3" },
    ]);
  });
});

describe("the global shortcut", () => {
  it("is ⌃⌥T, not ⌘⇧T (every browser's reopen-tab)", () => {
    expect(SEARCH_SHORTCUT).toBe("Control+Alt+T");
  });
});
