import { describe, expect, it } from "vitest";
import { isNewer, parseLatestRelease, RELEASES_PAGE } from "../src/main/version";

describe("isNewer", () => {
  it("compares each part as a number, not as text", () => {
    expect(isNewer("1.2.0", "1.1.9")).toBe(true);
    expect(isNewer("1.10.0", "1.9.0")).toBe(true); // as text, "1.10" < "1.9"
    expect(isNewer("2.0.0", "1.99.99")).toBe(true);
  });

  it("says no for the same or an older version", () => {
    expect(isNewer("1.0.0", "1.0.0")).toBe(false);
    expect(isNewer("1.0.0", "1.0.1")).toBe(false);
  });

  it("accepts a leading v (GitHub tags are usually v1.2.3)", () => {
    expect(isNewer("v1.1.0", "1.0.0")).toBe(true);
  });

  it("never nags on something it can't read (garbage, pre-releases)", () => {
    for (const v of ["", "latest", "1.2", "1.2.0-beta.1", "1.2.0.4"]) expect(isNewer(v, "1.0.0"), v).toBe(false);
  });
});

describe("parseLatestRelease: GitHub's answer to 'latest release'", () => {
  const url = `${RELEASES_PAGE}/tag/v1.1.0`;

  it("takes the version and the release page", () => {
    expect(parseLatestRelease({ tag_name: "v1.1.0", html_url: url, draft: false })).toEqual({ version: "1.1.0", url });
  });

  it("refuses anything else, so the app never opens a link it didn't expect", () => {
    for (const json of [
      null,
      "nope",
      {},
      { tag_name: "v1.1.0" },
      { tag_name: "v1.1.0", html_url: "https://evil.test/trellis.dmg" },
      { tag_name: "v1.1.0", html_url: "https://github.com/someone-else/repo/releases/tag/v1.1.0" },
      { tag_name: "not-a-version", html_url: url },
      { tag_name: "v1.1.0", html_url: url, draft: true },
      { tag_name: "v1.1.0", html_url: url, prerelease: true },
    ]) {
      expect(parseLatestRelease(json), JSON.stringify(json)).toBeNull();
    }
  });
});
