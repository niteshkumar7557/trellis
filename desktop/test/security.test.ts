import { describe, expect, it } from "vitest";
import { isAllowedUrl, isExternalSafe } from "../src/main/security";

const O = "https://trellis.niteshkumar.xyz";

describe("isAllowedUrl: only the site itself may load in the window", () => {
  it("allows any page on the site", () => {
    expect(isAllowedUrl(`${O}/map`, O)).toBe(true);
    expect(isAllowedUrl(`${O}/auth/done?x=1#y`, O)).toBe(true);
  });

  it("refuses lookalikes and downgrades", () => {
    for (const url of [
      "http://trellis.niteshkumar.xyz/", // same host, no TLS
      "https://trellis.niteshkumar.xyz.evil.test/", // our name as a prefix of theirs
      "https://evil.test/trellis.niteshkumar.xyz", // our name in the path
      "https://trellis.niteshkumar.xyz@evil.test/", // our name as the "user" part
      "https://trellis.niteshkumar.xyz:8443/", // another port is another origin
      "https://accounts.google.com/",
      "not a url",
      "",
    ]) {
      expect(isAllowedUrl(url, O), url).toBe(false);
    }
  });
});

describe("isExternalSafe: what may be handed to the Mac to open", () => {
  it("passes web links on to the browser", () => {
    expect(isExternalSafe("https://github.com/")).toBe(true);
    expect(isExternalSafe("http://example.com/")).toBe(true);
  });

  it("never passes files, scripts or app schemes", () => {
    for (const url of ["file:///etc/passwd", "javascript:alert(1)", "trellis://auth?code=x", "smb://server/share", "nope"]) {
      expect(isExternalSafe(url), url).toBe(false);
    }
  });
});
