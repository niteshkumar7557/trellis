import { describe, expect, it } from "vitest";
import { goItems, historyItems, SEARCH_SHORTCUT } from "../src/main/menu-template";

describe("the Go menu", () => {
  it("has Back and Forward on ⌘[ and ⌘], as in Safari and Chrome", () => {
    expect(historyItems()).toEqual([
      { id: "back", label: "Back", accelerator: "CmdOrCtrl+[" },
      { id: "forward", label: "Forward", accelerator: "CmdOrCtrl+]" },
    ]);
  });

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
