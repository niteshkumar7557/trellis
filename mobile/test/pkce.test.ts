// PKCE (RFC 7636), the secret that makes the trellis:// sign-in link useless to anyone but
// this app (docs/mobile.md §4).

import { challengeOf, newVerifier, toBase64Url } from "@/lib/pkce";

// expo-crypto needs the phone; under Jest it's backed by Node's crypto, so the glue code
// (encoding, base64url) is what's tested against the RFC's own example.
jest.mock("expo-crypto", () => {
  const nodeCrypto = jest.requireActual<typeof import("node:crypto")>("node:crypto");
  return {
    CryptoDigestAlgorithm: { SHA256: "SHA-256" },
    CryptoEncoding: { BASE64: "base64" },
    getRandomBytes: (n: number) => new Uint8Array(nodeCrypto.randomBytes(n)),
    digestStringAsync: async (_alg: string, data: string) => nodeCrypto.createHash("sha256").update(data).digest("base64"),
  };
});

describe("PKCE", () => {
  it("matches RFC 7636's worked example (Appendix B)", async () => {
    await expect(challengeOf("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")).resolves.toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  });

  it("makes a 43-character verifier from the URL-safe alphabet, different each time", () => {
    const a = newVerifier();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(newVerifier()).not.toBe(a);
  });

  it("turns base64 into base64url: - for +, _ for /, no = padding", () => {
    expect(toBase64Url("a+b/c==")).toBe("a-b_c");
  });
});
