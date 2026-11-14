// Sign in with Google: the two routes, with Google and the database replaced by fakes.
// The account rule (find, link or create) is tested on the real database in
// test/integration/google.test.ts.

import cookieParser from "cookie-parser";
import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { errorHandler, notFound } from "../src/middlewares/error.middleware.js";
import { saveRefreshToken } from "../src/repos/auth.repo.js";
import { signInWithGoogle } from "../src/repos/users.repo.js";
import authRoutes from "../src/routes/auth.routes.js";
import { googleEnabled, googleProfile, googleSignInUrl } from "../src/utils/google.js";

vi.mock("../src/utils/google.js", () => ({
  googleEnabled: vi.fn(),
  googleSignInUrl: vi.fn((state: string) => `https://accounts.google.test/auth?state=${state}`),
  googleProfile: vi.fn(),
}));
vi.mock("../src/repos/users.repo.js", () => ({ signInWithGoogle: vi.fn() }));
vi.mock("../src/repos/auth.repo.js", () => ({ saveRefreshToken: vi.fn() }));

const app = express();
app.use(cookieParser());
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
