// The update check (docs/mobile.md §3): the app asks GitHub for the latest release of the
// trellis-android repo and offers it when it's newer than the installed version.

import { isNewer, readRelease } from "@/lib/updates";

describe("isNewer", () => {
  it.each([
    ["1.0.1", "1.0.0", true],
    ["1.1.0", "1.0.9", true],
    ["2.0.0", "1.9.9", true],
    ["1.0.0", "1.0.0", false],
    ["1.0.0", "1.0.1", false],
    ["1.10.0", "1.9.0", true], // compared as numbers, not as text
  ])("%s is newer than %s: %s", (a, b, expected) => {
    expect(isNewer(a, b)).toBe(expected);
  });
});

describe("readRelease", () => {
  const release = {
    tag_name: "v1.2.0",
    html_url: "https://github.com/niteshkumar7557/trellis-android/releases/tag/v1.2.0",
    assets: [{ name: "Trellis-1.2.0-arm64.apk", browser_download_url: "https://github.com/x/Trellis-1.2.0-arm64.apk" }],
  };

  it("takes the version from the tag (without the v) and the APK's download link", () => {
    expect(readRelease(release)).toEqual({ version: "1.2.0", page: release.html_url, apk: "https://github.com/x/Trellis-1.2.0-arm64.apk" });
  });

  it("falls back to the release page when there's no APK attached", () => {
    expect(readRelease({ ...release, assets: [] })?.apk).toBeNull();
  });

  it("refuses an answer that isn't a release (a rate-limit message, say)", () => {
    expect(readRelease({ message: "API rate limit exceeded" })).toBeNull();
    expect(readRelease({ tag_name: "latest", html_url: "x", assets: [] })).toBeNull();
  });
});
