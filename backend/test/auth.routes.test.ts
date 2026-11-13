// The HTTP layer of /api/auth, with both repos replaced by fakes: no database needed.
// What is checked here is what the routes promise (backend-design.md §4): the bodies they
// accept, the one invalid_credentials answer, and the cookie's attributes. The SQL is
// checked against a real database in test/integration/auth.test.ts.

import bcrypt from "bcrypt";
import cookieParser from "cookie-parser";
import express from "express";
import request from "supertest";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import config from "../src/config/index.js";
import { errorHandler, notFound } from "../src/middlewares/error.middleware.js";
import { deleteRefreshToken, saveRefreshToken, usePasswordReset, useRefreshToken } from "../src/repos/auth.repo.js";
import { createPasswordUser, findLoginByEmail, getStudent } from "../src/repos/users.repo.js";
import authRoutes from "../src/routes/auth.routes.js";
import { hashToken, verifyAccessToken } from "../src/utils/tokens.js";

vi.mock("../src/repos/auth.repo.js", () => ({
  saveRefreshToken: vi.fn(),
  useRefreshToken: vi.fn(),
  deleteRefreshToken: vi.fn(),
  usePasswordReset: vi.fn(),
}));
vi.mock("../src/repos/users.repo.js", () => ({
  createPasswordUser: vi.fn(),
  findLoginByEmail: vi.fn(),
  getStudent: vi.fn(),
}));

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use("/api/auth", authRoutes);
app.use(notFound);
app.use(errorHandler);

const STUDENT = { id: "5", name: "Ada", email: "ada@example.com", joinedAt: "2026-11-13T00:00:00.000Z", hasPassword: true, goals: [] };
let adaHash = "";
// The cookie lives as long as the stored token: REFRESH_TOKEN_DAYS (60 unless .env says otherwise).
const MAX_AGE = `Max-Age=${config.refresh_token_days * 24 * 60 * 60}`;

beforeAll(async () => {
  adaHash = await bcrypt.hash("correct horse", 4); // cost 4: fast, and compare() doesn't care
});

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getStudent).mockResolvedValue(STUDENT);
});

/** The Set-Cookie header for the refresh token, as one string. */
function refreshCookie(res: request.Response): string {
  const cookies = ([] as string[]).concat(res.headers["set-cookie"] ?? []);
  return cookies.find((c) => c.startsWith("refresh_token=")) ?? "";
}

describe("POST /api/auth/register", () => {
  it("creates the account, signs in, and sets a locked-down refresh cookie", async () => {
    vi.mocked(createPasswordUser).mockResolvedValue(5);

    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: " Ada ", email: "  Ada@Example.COM ", password: "correct horse" });

    expect(res.status).toBe(201);
    expect(res.body.student).toEqual(STUDENT);
    expect(verifyAccessToken(res.body.accessToken)).toBe(5);

    // The repo got a trimmed name, a lower-cased email and a bcrypt hash, never the password.
    const [name, email, hashed] = vi.mocked(createPasswordUser).mock.calls[0]!;
    expect(name).toBe("Ada");
    expect(email).toBe("ada@example.com");
    expect(await bcrypt.compare("correct horse", hashed)).toBe(true);

    const cookie = refreshCookie(res);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Strict/);
    expect(cookie).toMatch(/Path=\/api\/auth/);
    expect(cookie).toContain(MAX_AGE);

    // Only the HASH of the cookie's token is stored.
    const token = cookie.split(";")[0]!.split("=")[1]!;
    expect(saveRefreshToken).toHaveBeenCalledWith(5, hashToken(token));
  });

  it("answers 409 email_taken when the address has an account", async () => {
    vi.mocked(createPasswordUser).mockResolvedValue(null);
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Ada", email: "ada@example.com", password: "correct horse" });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("email_taken");
    expect(refreshCookie(res)).toBe("");
  });

  it("refuses passwords under 8 characters or over 72 bytes", async () => {
    for (const password of ["short", "a".repeat(73), "😀".repeat(19)]) {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ name: "Ada", email: "ada@example.com", password });
      expect(res.status).toBe(400);
      expect(res.body.error.details[0].path).toBe("password");
    }
    // Exactly 72 bytes is fine.
    vi.mocked(createPasswordUser).mockResolvedValue(5);
    const ok = await request(app)
      .post("/api/auth/register")
      .send({ name: "Ada", email: "ada@example.com", password: "😀".repeat(18) });
    expect(ok.status).toBe(201);
  });

  it("refuses a bad email or an empty name", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "  ", email: "not-an-email", password: "correct horse" });
    expect(res.status).toBe(400);
    const paths = res.body.error.details.map((d: { path: string }) => d.path).sort();
    expect(paths).toEqual(["email", "name"]);
  });
});

describe("POST /api/auth/login", () => {
  it("signs in with the right password, whatever the email's capitals", async () => {
    vi.mocked(findLoginByEmail).mockResolvedValue({ id: 5, hashed_password: adaHash });
    const res = await request(app).post("/api/auth/login").send({ email: "ADA@example.com", password: "correct horse" });
    expect(res.status).toBe(200);
    expect(findLoginByEmail).toHaveBeenCalledWith("ada@example.com");
    expect(verifyAccessToken(res.body.accessToken)).toBe(5);
    expect(refreshCookie(res)).not.toBe("");
  });

  it("gives the SAME answer for a wrong password, an unknown email and a Google-only account", async () => {
    const cases = [
      { id: 5, hashed_password: adaHash }, // wrong password below
      null, // no such email
      { id: 6, hashed_password: null }, // Google only
    ];
    const bodies = [];
    for (const row of cases) {
      vi.mocked(findLoginByEmail).mockResolvedValue(row);
      const res = await request(app).post("/api/auth/login").send({ email: "ada@example.com", password: "wrong one" });
      expect(res.status).toBe(401);
      bodies.push(res.body);
    }
    expect(bodies[0].error.code).toBe("invalid_credentials");
    expect(bodies[1]).toEqual(bodies[0]);
    expect(bodies[2]).toEqual(bodies[0]);
    expect(saveRefreshToken).not.toHaveBeenCalled();
  });
});

describe("POST /api/auth/refresh", () => {
  it("swaps a live cookie for a new access token and sends the cookie again", async () => {
    vi.mocked(useRefreshToken).mockResolvedValue(5);
    const res = await request(app).post("/api/auth/refresh").set("Cookie", "refresh_token=abc");
    expect(res.status).toBe(200);
    expect(verifyAccessToken(res.body.accessToken)).toBe(5);
    expect(useRefreshToken).toHaveBeenCalledWith(hashToken("abc"));
    expect(refreshCookie(res)).toMatch(/^refresh_token=abc;/);
    expect(refreshCookie(res)).toContain(MAX_AGE);
  });

  it("answers 401 and clears the cookie when it is missing, expired or unknown", async () => {
    vi.mocked(useRefreshToken).mockResolvedValue(null);
    const dead = await request(app).post("/api/auth/refresh").set("Cookie", "refresh_token=old");
    expect(dead.status).toBe(401);
    expect(dead.body.error.code).toBe("unauthorized");
    expect(refreshCookie(dead)).toMatch(/^refresh_token=;.*Expires=Thu, 01 Jan 1970/);

    const none = await request(app).post("/api/auth/refresh");
    expect(none.status).toBe(401);
  });
});

describe("POST /api/auth/logout", () => {
  it("deletes the stored token and clears the cookie on the same path", async () => {
    const res = await request(app).post("/api/auth/logout").set("Cookie", "refresh_token=abc");
    expect(res.status).toBe(204);
    expect(deleteRefreshToken).toHaveBeenCalledWith(hashToken("abc"));
    expect(refreshCookie(res)).toMatch(/Path=\/api\/auth/);
  });

  it("answers 204 when already signed out", async () => {
    const res = await request(app).post("/api/auth/logout");
    expect(res.status).toBe(204);
    expect(deleteRefreshToken).not.toHaveBeenCalled();
  });
});

describe("POST /api/auth/reset-password", () => {
  it("sets a bcrypt hash of the new password through the link's token hash", async () => {
    vi.mocked(usePasswordReset).mockResolvedValue(true);
    const res = await request(app).post("/api/auth/reset-password").send({ token: "tok", password: "brand new pass" });
    expect(res.status).toBe(204);
    const [tokenHash, hashed] = vi.mocked(usePasswordReset).mock.calls[0]!;
    expect(tokenHash).toBe(hashToken("tok"));
    expect(await bcrypt.compare("brand new pass", hashed)).toBe(true);
    expect(refreshCookie(res)).toBe(""); // it does not sign this browser in
  });

  it("answers 400 reset_link_invalid for a dead link", async () => {
    vi.mocked(usePasswordReset).mockResolvedValue(false);
    const res = await request(app).post("/api/auth/reset-password").send({ token: "old", password: "brand new pass" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("reset_link_invalid");
  });

  it("applies the same password rules as sign-up", async () => {
    const res = await request(app).post("/api/auth/reset-password").send({ token: "tok", password: "short" });
    expect(res.status).toBe(400);
    expect(usePasswordReset).not.toHaveBeenCalled();
  });
});
