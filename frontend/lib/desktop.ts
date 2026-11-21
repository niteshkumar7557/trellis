// The Mac app, as the site sees it (docs/desktop.md).
//
// The app opens this same site in its own window and its preload script adds
// `window.trellisDesktop` (desktop/src/preload/index.ts). The site uses that only to hide
// "Get the Mac app" links from people already in the app.

import { useSyncExternalStore } from "react";

/**
 * Where to download it: the public release repo's LATEST release page, so this link never
 * needs changing when a new version ships. The page has the .dmg and the first-launch steps.
 */
export const MAC_APP_URL = "https://github.com/niteshkumar7557/trellis-desktop/releases/latest";

const noSubscribe = () => () => {};

/**
 * True inside the Mac app. useSyncExternalStore, not useState + useEffect: the server (and
 * the first render in the browser) say false, React then re-reads it on the client, with
 * no hydration mismatch and no effect that only copies a value into state.
 */
export function useIsDesktopApp(): boolean {
  return useSyncExternalStore(
    noSubscribe,
    () => typeof window !== "undefined" && "trellisDesktop" in window,
    () => false,
  );
}
