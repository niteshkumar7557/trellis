// The one Trellis window: the live site, locked down (docs/desktop.md §4).
//
// The renderer shows code from the network, so it is treated like any website: no Node,
// no Electron, its own sandboxed process. Everything it may ask main for goes through the
// preload (src/preload/index.ts), and main checks who's asking (isTrustedSender).

import { app, BrowserWindow, nativeTheme, screen, shell, type IpcMainEvent } from "electron";
import { join } from "node:path";
import { BACKGROUND, siteOrigin, START_PATH } from "./config";
import { isAllowedUrl, isExternalSafe } from "./security";
import { loadSettings, saveSettings, type Bounds } from "./settings";

let win: BrowserWindow | null = null;
/** True once the student really quits (⌘Q, the tray's Quit); until then closing only hides. */
let quitting = false;
app.on("before-quit", () => (quitting = true));
/** The page that couldn't load, so Retry goes back to it rather than to the start. */
let lastFailedUrl: string | null = null;

const OFFLINE_PAGE = join(__dirname, "..", "offline.html");

export const getMainWindow = () => win;

/** Bring the window forward (creating it again if needed) and open a page of the site. */
export function showPath(path: string): void {
  const w = win ?? createMainWindow();
  w.loadURL(siteOrigin() + path);
  w.show();
  w.focus();
}

/** Bring the window forward without changing its page. */
export function showWindow(): void {
  const w = win ?? createMainWindow();
  w.show();
  w.focus();
}

/**
 * Did this IPC message come from our window's top frame, showing our site or our offline
 * page? A message from anything else (an iframe, another window) is ignored. Electron's
 * checklist calls this "validate the sender of all IPC messages".
 */
export function isTrustedSender(event: IpcMainEvent): boolean {
  const frame = event.senderFrame;
  if (!win || event.sender !== win.webContents || !frame || frame !== win.webContents.mainFrame) return false;
  return isAllowedUrl(frame.url, siteOrigin()) || frame.url.startsWith("file://");
}

export function createMainWindow(): BrowserWindow {
  const settings = loadSettings(app.getPath("userData"));
  const bounds = settings.bounds && isOnScreen(settings.bounds) ? settings.bounds : undefined;

  const w = new BrowserWindow({
    width: 1280,
    height: 820,
    ...bounds,
    minWidth: 900,
    minHeight: 600,
    title: "Trellis",
    // Hidden until the first paint, so the student never sees an empty white frame.
    show: false,
    backgroundColor: nativeTheme.shouldUseDarkColors ? BACKGROUND.dark : BACKGROUND.light,
    webPreferences: {
      preload: join(__dirname, "..", "preload", "index.js"),
      // These three are Electron's defaults today; they're written out so the security
      // model is visible here, and so a future default change can't silently undo it.
      contextIsolation: true, // the page can't reach the preload's variables or Electron's objects
      sandbox: true, // the renderer is a plain Chromium process with no Node.js
      nodeIntegration: false, // no require() in the page
    },
  });
  win = w;

  w.once("ready-to-show", () => w.show());

  // ---- Navigation: the window only ever shows our site.
  // will-navigate: a link, a form, or `location.href = …` in the page.
  // will-redirect: a server answering 302 to somewhere else.
  // Anything off the site is cancelled and, if it's a web link, opened in the browser.
  const keepOnSite = (event: Electron.Event, url: string) => {
    if (isAllowedUrl(url, siteOrigin())) return;
    event.preventDefault();
    if (isExternalSafe(url)) shell.openExternal(url);
  };
  w.webContents.on("will-navigate", (event) => keepOnSite(event, event.url));
  w.webContents.on("will-redirect", (event) => {
    if (event.isMainFrame) keepOnSite(event, event.url);
  });

  // target="_blank" and window.open: no second Electron window, ever. A page of our own
  // site opens here; a web link opens in the browser.
  w.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedUrl(url, siteOrigin())) w.loadURL(url);
    else if (isExternalSafe(url)) shell.openExternal(url);
    return { action: "deny" };
  });

  // ---- Can't reach the site: show the bundled offline page with Retry.
  // -3 is ERR_ABORTED: what a navigation we cancelled above reports. It isn't "offline".
  w.webContents.on("did-fail-load", (_event, code, _desc, url, isMainFrame) => {
    if (!isMainFrame || code === -3) return;
    lastFailedUrl = url;
    w.loadFile(OFFLINE_PAGE);
  });

  // ---- Closing hides, quitting quits (the Mac convention: the app stays in the Dock and
  // the menu bar, the reminder keeps working, and reopening is instant with the page as it
  // was). The bounds are saved either way.
  w.on("close", (event) => {
    const dir = app.getPath("userData");
    saveSettings(dir, { ...loadSettings(dir), bounds: w.getNormalBounds() });
    if (!quitting) {
      event.preventDefault();
      w.hide();
    }
  });
  w.on("closed", () => (win = null));

  w.loadURL(siteOrigin() + START_PATH);
  return w;
}

/** The offline page's Retry: try the page that failed again (or the start page). */
export function retry(): void {
  win?.loadURL(lastFailedUrl && isAllowedUrl(lastFailedUrl, siteOrigin()) ? lastFailedUrl : siteOrigin() + START_PATH);
}

/** A saved position is used only if it's still on a connected screen (a monitor may have been unplugged). */
function isOnScreen(b: Bounds): boolean {
  return screen.getAllDisplays().some(({ workArea: a }) => b.x < a.x + a.width && b.x + b.width > a.x && b.y < a.y + a.height && b.y + b.height > a.y);
}

/**
 * Bring Trellis forward with the site's search open.
 *
 * It presses ⌘K for the page (`sendInputEvent` is a real key event, as if typed), so the
 * site's own shortcut handler opens its search. The alternative, a new bridge call the
 * site would listen for, means changing the frontend for something the site can already
 * do. The cost: the site's ⌘K toggles, so pressing it while search is open closes it.
 */
export function openSearch(): void {
  const w = win ?? createMainWindow();
  w.show();
  w.focus();
  const press = () => {
    w.webContents.focus();
    for (const type of ["keyDown", "keyUp"] as const) w.webContents.sendInputEvent({ type, keyCode: "K", modifiers: ["meta"] });
  };
  // A window that's still loading would drop the key; wait for it.
  if (w.webContents.isLoading()) w.webContents.once("did-finish-load", press);
  else press();
}
