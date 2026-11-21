// The menu-bar icon ("Tray" in Electron) and its menu.
//
// The icon is a "template image": black on transparent, its file name ending in
// "Template". macOS then recolours it itself for a light or dark menu bar, like every
// built-in icon there. scripts/icons.ts makes it from the SVG mark (docs/desktop.md §8).

import { app, Menu, Tray } from "electron";
import { join } from "node:path";
import type { AppActions } from "./menu-template";

let tray: Tray | null = null;

export function createTray(a: AppActions): void {
  // `assets/` sits next to `dist/` both from source and inside the packaged app.
  // nativeImage picks trayTemplate@2x.png on Retina screens by itself.
  tray = new Tray(join(__dirname, "..", "..", "assets", "trayTemplate.png"));
  tray.setToolTip(app.name);
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "Show Trellis", click: () => a.show() },
      { label: "Search…", click: () => a.openSearch() },
      { type: "separator" },
      { label: "Check for Updates…", click: () => a.checkForUpdates() },
      { type: "separator" },
      { label: "Quit Trellis", role: "quit" },
    ]),
  );
}
