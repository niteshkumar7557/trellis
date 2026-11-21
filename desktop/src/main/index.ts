// The main process starts here: the Node.js program that owns the app (docs/desktop.md §2).
//
// Order matters in this file. Anything macOS may deliver while the app is still starting
// (a second launch, later a trellis:// link) must have its listener attached before
// `whenReady`, or it's lost.

import { app, ipcMain, session, shell } from "electron";
import { siteOrigin } from "./config";
import { isAllowedUrl, isExternalSafe } from "./security";
import { buildMenu } from "./menu";
import type { AppActions } from "./menu-template";
import { registerShortcut, unregisterShortcuts } from "./shortcut";
import { createTray } from "./tray";
import { createMainWindow, isTrustedSender, openSearch, retry, showPath, showWindow } from "./window";

/** Everything the menu bar, the tray and the shortcut can do, in one place. */
const actions: AppActions = {
  show: showWindow,
  go: showPath,
  openSearch,
  checkForUpdates: () => {}, // Task 3
};

// The e2e tests run each launch with a throwaway data folder, so one test's saved window
// position or cookies can't leak into the next. Ignored in the packaged app.
if (!app.isPackaged && process.env.TRELLIS_USER_DATA) app.setPath("userData", process.env.TRELLIS_USER_DATA);

// ---- One copy of the app only. A second launch (double-clicking the icon again, or macOS
// starting us for a link) hands over to the first and quits. Without this there could be
// two windows sharing one cookie store, and a deep link could reach the wrong copy.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => showWindow());

  // ---- Every web page the app ever creates gets the same hard limits, even ones this
  // code doesn't create directly. Electron's checklist: "disable or limit navigation",
  // "disable or limit creation of new windows", "verify webview options".
  app.on("web-contents-created", (_event, contents) => {
    contents.on("will-attach-webview", (event) => event.preventDefault()); // no <webview> tags
    contents.setWindowOpenHandler(({ url }) => {
      if (isExternalSafe(url) && !isAllowedUrl(url, siteOrigin())) shell.openExternal(url);
      return { action: "deny" };
    });
  });

  app.whenReady().then(() => {
    // ---- Permissions: the site needs exactly one, writing to the clipboard ("Copy
    // prompt"). Everything else (camera, microphone, location, notifications from the
    // page, MIDI, …) is refused, from any origin. Two handlers because Chromium asks two
    // ways: a request (a prompt the student would see) and a check (a silent "may I?").
    const allowed = (permission: string, origin: string) =>
      permission === "clipboard-sanitized-write" && isAllowedUrl(origin, siteOrigin());
    session.defaultSession.setPermissionRequestHandler((contents, permission, callback) =>
      callback(allowed(permission, contents.getURL())),
    );
    session.defaultSession.setPermissionCheckHandler((_contents, permission, origin) => allowed(permission, origin));

    ipcMain.on("trellis:retry", (event) => {
      if (isTrustedSender(event)) retry();
    });

    createMainWindow();
    buildMenu(actions);
    createTray(actions);
    registerShortcut(actions.openSearch);
  });

  // Global shortcuts belong to the whole system: give them back when the app quits.
  app.on("will-quit", unregisterShortcuts);

  // Clicking the Dock icon with the window hidden brings it back.
  app.on("activate", () => showWindow());
}
