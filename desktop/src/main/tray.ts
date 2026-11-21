// The menu-bar icon ("Tray" in Electron) and its menu.
//
// The icon is a "template image": black on transparent, its file name ending in
// "Template". macOS then recolours it itself for a light or dark menu bar, like every
// built-in icon there. scripts/icons.ts makes it from the SVG mark (docs/desktop.md §8).
//
// The menu is rebuilt by refreshTray() whenever something it shows changes (the reminder
// settings, from Task 3), because a built Electron menu can't be edited in place.

import { app, Menu, Tray, type MenuItemConstructorOptions } from "electron";
import { join } from "node:path";
import type { AppActions } from "./menu-template";

let tray: Tray | null = null;
let actions: AppActions | null = null;
/** Extra items other files add (the reminder, in reminder.ts). */
let extraItems: () => MenuItemConstructorOptions[] = () => [];

export function createTray(a: AppActions): void {
  actions = a;
  // `assets/` sits next to `dist/` both from source and inside the packaged app.
  // nativeImage picks trayTemplate@2x.png on Retina screens by itself.
  tray = new Tray(join(__dirname, "..", "..", "assets", "trayTemplate.png"));
  tray.setToolTip(app.name);
  refreshTray();
}

export function setTrayExtras(build: () => MenuItemConstructorOptions[]): void {
  extraItems = build;
  refreshTray();
}

export function refreshTray(): void {
  if (!tray || !actions) return;
  const a = actions;
  const extras = extraItems();
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "Show Trellis", click: () => a.show() },
      { label: "Search…", click: () => a.openSearch() },
      { type: "separator" },
      ...extras,
      ...(extras.length ? [{ type: "separator" as const }] : []),
      { label: "Check for Updates…", click: () => a.checkForUpdates() },
      { type: "separator" },
      { label: "Quit Trellis", role: "quit" },
    ]),
  );
}
