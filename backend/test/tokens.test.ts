// Tests for src/utils/tokens.ts and the requireAuth middleware that uses it.

import express from "express";
import jwt from "jsonwebtoken";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { currentUserId, requireAuth } from "../src/middlewares/auth.middleware.js";
import { errorHandler } from "../src/middlewares/error.middleware.js";
import { hashToken, newRandomToken, signAccessToken, verifyAccessToken } from "../src/utils/tokens.js";
import { TEST_JWT_SECRET } from "./auth-token.js";

describe("access tokens", () => {
  it("carry the user id and nothing else", () => {
    const token = signAccessToken(42);
    expect(verifyAccessToken(token)).toBe(42);
    const payload = jwt.decode(token) as Record<string, unknown>;
    expect(Object.keys(payload).sort()).toEqual(["exp", "iat", "sub"]);
  });

  it("are refused when expired, forged, or of the old {id, email} shape", () => {
    const expired = jwt.sign({}, TEST_JWT_SECRET, { subject: "1", expiresIn: -10 });
    const forged = jwt.sign({}, "someone-elses-secret-that-is-long-enough", { subject: "1" });
    const old = jwt.sign({ id: 1, role: "user", email: "a@b.c" }, TEST_JWT_SECRET);
    const notANumber = jwt.sign({}, TEST_JWT_SECRET, { subject: "admin" });
    for (const token of [expired, forged, old, notANumber, "not-a-jwt"]) {
      expect(verifyAccessToken(token)).toBeNull();
    }
  });

  it("refuse an unsigned token (alg: none)", () => {
    const unsigned = jwt.sign({}, "", { subject: "1", algorithm: "none" });
    expect(verifyAccessToken(unsigned)).toBeNull();
  });
});

describe("random tokens and their hashes", () => {
  it("are long, different every time, and hash the same way every time", () => {
    const a = newRandomToken();
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(newRandomToken()).not.toBe(a);
    expect(hashToken(a)).toBe(hashToken(a));
    expect(hashToken(a)).not.toBe(a);
  });
});

describe("requireAuth", () => {
  const app = express();
  app.get("/who", requireAuth, (req, res) => {
    res.json({ userId: currentUserId(req) });
  });
  app.get("/forgot-the-guard", (req, res) => {
    res.json({ userId: currentUserId(req) });
  });
  app.use(errorHandler);

  it("lets a valid token through and sets req.userId", async () => {
    const res = await request(app).get("/who").set("Authorization", `Bearer ${signAccessToken(7)}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ userId: 7 });
  });

  it("answers 401 unauthorized, in the error shape, with no token or a bad one", async () => {
    for (const header of [undefined, "Bearer nonsense", `Basic ${signAccessToken(7)}`]) {
      const req = request(app).get("/who");
      const res = await (header ? req.set("Authorization", header) : req);
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("unauthorized");
    }
  });

  it("fails loudly (500) when a route forgot requireAuth", async () => {
    const quiet = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await request(app).get("/forgot-the-guard");
    expect(res.status).toBe(500);
    quiet.mockRestore();
  });
});
