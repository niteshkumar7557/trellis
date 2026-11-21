import { describe, expect, it } from "vitest";
import { createLinkQueue, parseDeepLink, type DeepLink } from "../src/main/deeplink";

const CODE = "0123456789abcdef".repeat(4); // 64 hex characters, like the backend's codes

describe("parseDeepLink: which trellis:// links the app accepts", () => {
  it("a sign-in hand-off", () => {
    expect(parseDeepLink(`trellis://auth?code=${CODE}`)).toEqual({ kind: "auth", code: CODE });
  });

  it("opening the map", () => {
    expect(parseDeepLink("trellis://open/map")).toEqual({ kind: "open", path: "/map" });
  });

  it("nothing else: any other app or web page can send us a link", () => {
    for (const url of [
      `trellis://auth?code=${CODE.slice(1)}`, // too short
      `trellis://auth?code=${CODE.toUpperCase()}`, // not our alphabet
      `trellis://auth?code=${CODE}&code=${CODE}`, // two codes: ambiguous
      "trellis://auth",
      "trellis://open/settings",
      "trellis://open/map/../../evil",
      "trellis://evil",
      `https://trellis.niteshkumar.xyz/auth?code=${CODE}`,
      "not a url",
    ]) {
      expect(parseDeepLink(url), url).toBeNull();
    }
  });
});

describe("createLinkQueue: links that arrive before the app is ready", () => {
  it("holds them until ready(), then handles them in order", () => {
    const seen: DeepLink[] = [];
    const q = createLinkQueue((l) => seen.push(l));
    q.push("trellis://open/map");
    q.push(`trellis://auth?code=${CODE}`);
    expect(seen).toEqual([]);
    q.ready();
    expect(seen).toEqual([
      { kind: "open", path: "/map" },
      { kind: "auth", code: CODE },
    ]);
  });

  it("handles them at once after ready(), and drops links it doesn't accept", () => {
    const seen: DeepLink[] = [];
    const q = createLinkQueue((l) => seen.push(l));
    q.ready();
    q.push("trellis://evil");
    q.push("trellis://open/map");
    expect(seen).toEqual([{ kind: "open", path: "/map" }]);
  });
});
