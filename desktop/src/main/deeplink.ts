// trellis:// links (docs/desktop.md §7). Pure, so it's unit-tested.
//
// Any app or web page on the Mac can open a trellis:// link, so every link is untrusted
// input. The app accepts exactly two shapes and drops everything else.

export type DeepLink = { kind: "auth"; code: string } | { kind: "open"; path: "/map" };

/** The backend's hand-off codes are newRandomToken(): 64 lowercase hex characters. */
const CODE = /^[0-9a-f]{64}$/;

export function parseDeepLink(raw: string): DeepLink | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "trellis:") return null;

  // trellis://auth?code=… → host "auth", one code.
  if (url.host === "auth" && (url.pathname === "" || url.pathname === "/")) {
    const codes = url.searchParams.getAll("code");
    return codes.length === 1 && CODE.test(codes[0]!) ? { kind: "auth", code: codes[0]! } : null;
  }
  // trellis://open/map → host "open", path "/map". Only the map, for now: a link must
  // never be able to send the window to an arbitrary page.
  if (url.host === "open" && url.pathname === "/map" && url.search === "") return { kind: "open", path: "/map" };
  return null;
}

/**
 * Links can arrive before the app is ready: when a link is what LAUNCHED the app, macOS
 * delivers it during start-up, before there's a window to act on. The queue holds them
 * until ready(), then hands them over in order; after that, at once.
 */
export function createLinkQueue(handle: (link: DeepLink) => void) {
  let isReady = false;
  const waiting: DeepLink[] = [];
  return {
    push(raw: string) {
      const link = parseDeepLink(raw);
      if (!link) return;
      if (isReady) handle(link);
      else waiting.push(link);
    },
    ready() {
      isReady = true;
      for (const link of waiting.splice(0)) handle(link);
    },
  };
}
