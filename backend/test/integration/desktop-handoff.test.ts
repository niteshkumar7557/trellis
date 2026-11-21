// The desktop app's Google hand-off against the REAL Postgres (docs/desktop.md §5): the
// one-time code works once, only with the right verifier, and only for two minutes.
// What the unit tests can't see: the single UPDATE that makes "once" true even when two
// requests race.

import crypto from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import app from "../../src/app.js";
import pool from "../../src/db/index.js";
import { createHandoff } from "../../src/repos/desktop-handoffs.repo.js";
import { hashToken, newRandomToken, pkceChallenge } from "../../src/utils/tokens.js";
import { deleteUsers, registerStudent } from "./helpers.js";

const DOMAIN = "@it-desktop.trellis.test";
let userId: number;

beforeAll(async () => {
  await deleteUsers(DOMAIN);
  ({ userId } = await registerStudent(DOMAIN));
});
afterAll(async () => {
  await deleteUsers(DOMAIN); // ON DELETE CASCADE takes the hand-off rows too
  await pool.end();
});

/** What the app and the callback do: a verifier (kept by the app) and a stored code. */
async function newHandoff() {
  const verifier = crypto.randomBytes(32).toString("base64url");
  const code = newRandomToken();
  await createHandoff(userId, hashToken(code), pkceChallenge(verifier));
  return { code, verifier };
}
const exchange = (code: string, verifier: string) => request(app).post("/api/auth/desktop/exchange").send({ code, verifier });

describe("POST /api/auth/desktop/exchange", () => {
  it("signs the app in with the right code and verifier: an access token and a refresh cookie", async () => {
    const { code, verifier } = await newHandoff();
    const res = await exchange(code, verifier);
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(Number(res.body.student.id)).toBe(userId);
    const cookie = ([] as string[]).concat(res.headers["set-cookie"] ?? []).find((c) => c.startsWith("refresh_token="));
    expect(cookie).toMatch(/HttpOnly/);
  });

  it("a code works once", async () => {
    const { code, verifier } = await newHandoff();
    expect((await exchange(code, verifier)).status).toBe(200);
    const again = await exchange(code, verifier);
    expect(again.status).toBe(400);
    expect(again.body.error.code).toBe("handoff_invalid");
  });

  it("a code works once, even when two exchanges race", async () => {
    const { code, verifier } = await newHandoff();
    const statuses = (await Promise.all([exchange(code, verifier), exchange(code, verifier)])).map((r) => r.status).sort();
    expect(statuses).toEqual([200, 400]);
  });

  it("a stolen code is useless without the app's verifier, and doesn't burn the real sign-in", async () => {
    const { code, verifier } = await newHandoff();
    const wrong = crypto.randomBytes(32).toString("base64url");
    expect((await exchange(code, wrong)).status).toBe(400);
    expect((await exchange(code, verifier)).status).toBe(200);
  });

  it("an expired code is refused", async () => {
    const { code, verifier } = await newHandoff();
    await pool.query("UPDATE desktop_handoffs SET expires_at = NOW() - interval '1 second' WHERE code_hash = $1", [hashToken(code)]);
    expect((await exchange(code, verifier)).status).toBe(400);
  });

  it("stores only the code's hash, never the code", async () => {
    const { code } = await newHandoff();
    const { rows } = await pool.query("SELECT code_hash FROM desktop_handoffs WHERE user_id = $1", [userId]);
    expect(rows.map((r) => r.code_hash)).toContain(hashToken(code));
    expect(rows.map((r) => r.code_hash)).not.toContain(code);
  });
});
