// The fixed parts of the menus, as plain data, so a test can pin them down
// (no `electron` import here). menu.ts and tray.ts turn them into real menus.

export interface GoItem {
  label: string;
  path: string;
  accelerator: string;
}

/**
 * The Go menu mirrors the site's sidebar (Map, Check-ins, Settings), so the shortcuts match
 * what the student sees. "CmdOrCtrl" is Electron's way of writing ⌘ on a Mac.
 */
export function goItems(): GoItem[] {
  return [
    { label: "Map", path: "/map", accelerator: "CmdOrCtrl+1" },
    { label: "Check-ins", path: "/check-ins", accelerator: "CmdOrCtrl+2" },
    { label: "Settings", path: "/settings", accelerator: "CmdOrCtrl+3" },
  ];
}

/**
 * The global shortcut: bring Trellis forward with search open, from any app.
 * Not ⌘⇧T: a global shortcut takes the keys away from EVERY app, and ⌘⇧T is "reopen the
 * closed tab" in every browser. ⌃⌥T is free in macOS and in common apps.
 */
export const SEARCH_SHORTCUT = "Control+Alt+T";

/** What the menus and the tray can ask the app to do. index.ts supplies the real functions. */
export interface AppActions {
  show(): void;
  go(path: string): void;
  openSearch(): void;
  checkForUpdates(): void;
}
