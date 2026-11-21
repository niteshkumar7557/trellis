import { describe, expect, it } from "vitest";
import { challengeOf, makeVerifier } from "../src/main/pkce";

describe("PKCE (RFC 7636)", () => {
  it("matches the standard's own worked example (Appendix B)", () => {
    // If this passes, the app computes the challenge exactly as the backend's
    // pkceChallenge() does (both are the RFC's S256 method).
    expect(challengeOf("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  });

  it("makes a fresh 43-character base64url verifier every time", () => {
    const a = makeVerifier();
    const b = makeVerifier();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a).not.toBe(b);
  });
});
