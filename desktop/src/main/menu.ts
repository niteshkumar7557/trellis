// The menu bar at the top of the screen (on a Mac it belongs to the app, not the window).
//
// Most items use a `role`: Electron then gives the standard macOS item, with its usual
// name, shortcut and behaviour. That matters more than it looks: without the Edit menu's
// roles, ⌘C / ⌘V / ⌘A don't work inside the page at all, because on a Mac those keys are
// menu items, not something the web page handles.

import { app, Menu, type MenuItemConstructorOptions } from "electron";
import { goItems, historyItems, type AppActions } from "./menu-template";

export function buildMenu(actions: AppActions): void {
  const template: MenuItemConstructorOptions[] = [
    {
      label: app.name,
      submenu: [
        { role: "about" },
        { label: "Check for Updates…", click: () => actions.checkForUpdates() },
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    { role: "editMenu" },
    {
      label: "View",
      submenu: [
        // No accelerator here: ⌘K is handled by the page itself, and a menu shortcut would
        // catch the key before the page ever saw it.
        { label: "Search…", click: () => actions.openSearch() },
        { type: "separator" },
        { role: "reload" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Go",
      submenu: [
        // Back and Forward start greyed out; window.ts updates them on every navigation.
        ...historyItems().map((item) => ({
          id: item.id,
          label: item.label,
          accelerator: item.accelerator,
          enabled: false,
          click: () => (item.id === "back" ? actions.back() : actions.forward()),
        })),
        { type: "separator" as const },
        ...goItems().map((item) => ({ label: item.label, accelerator: item.accelerator, click: () => actions.go(item.path) })),
      ],
    },
    { role: "windowMenu" },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
