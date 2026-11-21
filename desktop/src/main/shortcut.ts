// The global shortcut (⌃⌥T): works while ANY app is in front.
//
// Global shortcuts are registered with macOS for the whole system, so:
// - registering can fail (another app already owns the keys); the app then carries on
//   without it and says so in the log, rather than crashing;
// - they must be released when the app quits (index.ts calls unregisterShortcuts).

import { globalShortcut } from "electron";
import { SEARCH_SHORTCUT } from "./menu-template";

export function registerShortcut(onPress: () => void): boolean {
  const ok = globalShortcut.register(SEARCH_SHORTCUT, onPress);
  if (!ok) console.warn(`Trellis: ${SEARCH_SHORTCUT} is taken by another app; the global shortcut is off.`);
  return ok;
}

export function unregisterShortcuts(): void {
  globalShortcut.unregisterAll();
}
