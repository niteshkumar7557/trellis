// Sign in with Google: the two routes, with Google and the database replaced by fakes.
// The account rule (find, link or create) is tested on the real database in
// test/integration/google.test.ts.

import cookieParser from "cookie-parser";
import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { errorHandler, notFound } from "../src/middlewares/error.middleware.js";
import { saveRefreshToken } from "../src/repos/auth.repo.js";
import { createHandoff } from "../src/repos/desktop-handoffs.repo.js";
import { signInWithGoogle } from "../src/repos/users.repo.js";
import authRoutes from "../src/routes/auth.routes.js";
import { googleEnabled, googleProfile, googleSignInUrl } from "../src/utils/google.js";
import { hashToken } from "../src/utils/tokens.js";

vi.mock("../src/utils/google.js", () => ({
  googleEnabled: vi.fn(),
  googleSignInUrl: vi.fn((state: string) => `https://accounts.google.test/auth?state=${state}`),
  googleProfile: vi.fn(),
}));
vi.mock("../src/repos/users.repo.js", () => ({ signInWithGoogle: vi.fn() }));
vi.mock("../src/repos/auth.repo.js", () => ({ saveRefreshToken: vi.fn() }));
vi.mock("../src/repos/desktop-handoffs.repo.js", () => ({ createHandoff: vi.fn(), useHandoff: vi.fn() }));

const app = express();
app.use(cookieParser());
app.use(express.json()); // the desktop exchange takes a JSON body
app.use("/api/auth", authRoutes);
app.use(notFound);
app.use(errorHandler);

const cookies = (res: request.Response) => ([] as string[]).concat(res.headers["set-cookie"] ?? []);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(googleEnabled).mockReturnValue(true);
});

describe("GET /api/auth/google", () => {
  it("answers 404 while Google sign-in isn't configured", async () => {
    vi.mocked(googleEnabled).mockReturnValue(false);
    expect((await request(app).get("/api/auth/google")).status).toBe(404);
    expect((await request(app).get("/api/auth/google/callback")).status).toBe(404);
  });

  it("sets a Lax state cookie and redirects to Google with the same state", async () => {
    const res = await request(app).get("/api/auth/google");
    expect(res.status).toBe(302);
    const cookie = cookies(res).find((c) => c.startsWith("google_state="))!;
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Lax/); // Strict would never come back from Google
    expect(cookie).toMatch(/Path=\/api\/auth\/google/);
    const state = cookie.split(";")[0]!.split("=")[1];
    expect(res.headers.location).toBe(`https://accounts.google.test/auth?state=${state}`);
    expect(googleSignInUrl).toHaveBeenCalledWith(state);
  });
});

describe("GET /api/auth/google/callback", () => {
  const callback = (query: string, state?: string) => {
    const req = request(app).get(`/api/auth/google/callback?${query}`);
    return state ? req.set("Cookie", `google_state=${state}`) : req;
  };

  it("refuses a reply this browser didn't ask for (no or different state cookie)", async () => {
    for (const res of [await callback("code=c&state=s"), await callback("code=c&state=s", "other")]) {
      expect(res.status).toBe(302);
      expect(res.headers.location).toMatch(/\/login\?error=google$/);
    }
    expect(googleProfile).not.toHaveBeenCalled();
  });

  it("refuses an address Google hasn't verified", async () => {
    vi.mocked(googleProfile).mockResolvedValue({ sub: "g1", email: "a@x.test", emailVerified: false, name: "A" });
    const res = await callback("code=c&state=s", "s");
    expect(res.headers.location).toMatch(/\/login\?error=google_unverified$/);
    expect(signInWithGoogle).not.toHaveBeenCalled();
  });

  it("sends a failed code exchange back to login, quietly", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(googleProfile).mockRejectedValue(new Error("invalid_grant"));
    const res = await callback("code=c&state=s", "s");
    expect(res.headers.location).toMatch(/\/login\?error=google$/);
  });

  it("signs in: refresh cookie set, state cookie cleared, on to /auth/done", async () => {
    const profile = { sub: "g1", email: "a@x.test", emailVerified: true, name: "Ada" };
    vi.mocked(googleProfile).mockResolvedValue(profile);
    vi.mocked(signInWithGoogle).mockResolvedValue(7);
    const res = await callback("code=c&state=s", "s");
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/\/auth\/done$/);
    expect(signInWithGoogle).toHaveBeenCalledWith(profile);
    expect(saveRefreshToken).toHaveBeenCalledWith(7, expect.any(String));
    expect(cookies(res).find((c) => c.startsWith("refresh_token="))).toMatch(/SameSite=Strict/);
    expect(cookies(res).find((c) => c.startsWith("google_state="))).toMatch(/Expires=Thu, 01 Jan 1970/);
  });
});

// ------------------------------------------------------------------ the desktop app (docs/desktop.md §5)

// A real PKCE challenge: base64url(SHA-256(verifier)), 43 characters (RFC 7636 Appendix B).
const CHALLENGE = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";

describe("GET /api/auth/google?desktop=<challenge>", () => {
  it("keeps the app's challenge in a second short-lived cookie, then goes to Google as usual", async () => {
    const res = await request(app).get(`/api/auth/google?desktop=${CHALLENGE}`);
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/^https:\/\/accounts\.google\.test\/auth\?state=/);
    const cookie = cookies(res).find((c) => c.startsWith("google_desktop="))!;
    expect(cookie).toContain(`google_desktop=${CHALLENGE}`);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Lax/);
    expect(cookie).toMatch(/Path=\/api\/auth\/google/);
  });

  it("refuses a challenge that isn't 43 base64url characters", async () => {
    for (const bad of ["short", `${CHALLENGE}x`, `${CHALLENGE.slice(0, 42)}/`]) {
      const res = await request(app).get(`/api/auth/google?desktop=${encodeURIComponent(bad)}`);
      expect(res.status, bad).toBe(400);
      expect(res.body.error.code).toBe("invalid_request");
    }
  });

  it("a plain start (the website) sets no desktop cookie", async () => {
    const res = await request(app).get("/api/auth/google");
    expect(cookies(res).some((c) => c.startsWith("google_desktop="))).toBe(false);
  });
});

describe("GET /api/auth/google/callback for the desktop app", () => {
  const profile = { sub: "g1", email: "a@x.test", emailVerified: true, name: "Ada" };

  it("starts no session in the browser; stores a one-time code and sends it on to /auth/desktop", async () => {
    vi.mocked(googleProfile).mockResolvedValue(profile);
    vi.mocked(signInWithGoogle).mockResolvedValue(7);
    const res = await request(app)
      .get("/api/auth/google/callback?code=c&state=s")
      .set("Cookie", [`google_state=s`, `google_desktop=${CHALLENGE}`]);

    expect(res.status).toBe(302);
    const code = /\/auth\/desktop\?code=([0-9a-f]{64})$/.exec(res.headers.location)?.[1];
    expect(code).toBeDefined();
    // Only the hash is stored, with the challenge and the account.
    expect(createHandoff).toHaveBeenCalledWith(7, hashToken(code!), CHALLENGE);
    // The browser is NOT signed in: no refresh token saved, no cookie set.
    expect(saveRefreshToken).not.toHaveBeenCalled();
    expect(cookies(res).some((c) => c.startsWith("refresh_token="))).toBe(false);
    expect(cookies(res).find((c) => c.startsWith("google_desktop="))).toMatch(/Expires=Thu, 01 Jan 1970/);
  });
});

describe("POST /api/auth/desktop/exchange", () => {
  it("refuses a body that isn't a code and a verifier of the right shape", async () => {
    for (const body of [{}, { code: "x", verifier: "y" }, { code: "a".repeat(64), verifier: "short" }]) {
      const res = await request(app).post("/api/auth/desktop/exchange").send(body);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("invalid_request");
    }
  });
});
