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

import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("trellisDesktop", {
  /** Lets the site tell it's running inside the app, if it ever needs to. */
  isDesktop: true,
  /** The offline page's Retry button. */
  retry: () => ipcRenderer.send("trellis:retry"),
});
