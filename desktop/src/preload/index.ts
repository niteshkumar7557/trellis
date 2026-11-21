// The bridge between the page and the app (docs/desktop.md §2).
//
// This runs inside the page's process, before the page, in a separate "isolated world":
// the page can't see or change anything here except what exposeInMainWorld hands it.
//
// Rules for this file:
// - expose FUNCTIONS that send one fixed message, never ipcRenderer itself (that would let
//   the page send any message to main);
// - take and return plain values only;
// - keep it tiny: every function here is something a website can ask the Mac to do.
//
// It can't import our other files: a sandboxed preload may only require Electron and a few
// Node built-ins. So decisions live in the main process (swipe.ts), and this only reports.

import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("trellisDesktop", {
  /** Lets the site tell it's running inside the app (it hides "Get the Mac app" links). */
  isDesktop: true,
  /** The offline page's Retry button. */
  retry: () => ipcRenderer.send("trellis:retry"),
});

// ---- Two-finger swipe for Back and Forward (main decides, in swipe.ts).
//
// Listening on `window` means hearing each scroll LAST, after the page's own handlers on
// the elements under the pointer. By then `defaultPrevented` says whether the page used it:
// the map calls preventDefault on every scroll to pan its canvas, so a swipe over the map
// stays a pan. Passive: this never blocks or slows the page's scrolling.
window.addEventListener(
  "wheel",
  (e) => {
    if (!e.isTrusted) return; // only real trackpad and mouse input; page script can't fake a swipe
    const blocked = e.defaultPrevented || e.ctrlKey || canScrollSideways(e.target, e.deltaX);
    ipcRenderer.send("trellis:wheel", { dx: e.deltaX, dy: e.deltaY, blocked });
  },
  { passive: true },
);

/**
 * Could the thing under the fingers scroll sideways itself, in this direction? Then the
 * scroll is for it (a long text field, a wide table), not a request to go back.
 */
function canScrollSideways(target: EventTarget | null, dx: number): boolean {
  for (let el = target instanceof Element ? target : null; el; el = el.parentElement) {
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return true;
    const { overflowX } = getComputedStyle(el);
    if ((overflowX === "auto" || overflowX === "scroll") && el.scrollWidth > el.clientWidth) {
      if (dx < 0 ? el.scrollLeft > 0 : el.scrollLeft + el.clientWidth < el.scrollWidth) return true;
    }
  }
  return false;
}
