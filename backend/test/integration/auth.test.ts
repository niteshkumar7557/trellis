// The whole sign-in cycle against the REAL Postgres, through the real app: register, me,
// refresh, logout. What the unit tests can't see: the SQL, the unique email, the stored
// hashes and the sliding expiry.
//
// Every account made here uses the @it.trellis.test domain and is deleted afterwards
// (ON DELETE CASCADE takes its tokens with it).

import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import app from "../../src/app.js";
import pool from "../../src/db/index.js";
import { hashToken } from "../../src/utils/tokens.js";

const DOMAIN = "@it.trellis.test";
const cleanUp = () => pool.query("DELETE FROM users WHERE email LIKE $1", [`%${DOMAIN}`]);

beforeAll(cleanUp);
afterAll(async () => {
  await cleanUp();
  await pool.end();
});

/** The refresh token inside a response's Set-Cookie header. */
function refreshTokenOf(res: request.Response): string {
  const cookies = ([] as string[]).concat(res.headers["set-cookie"] ?? []);
  const cookie = cookies.find((c) => c.startsWith("refresh_token=")) ?? "";
  return cookie.split(";")[0]!.slice("refresh_token=".length);
}

describe("the sign-in cycle", () => {
  const email = `ada${DOMAIN}`;
  let accessToken = "";
  let refreshToken = "";

  it("registers, storing a lower-case email, a bcrypt hash and only a token HASH", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Ada", email: email.toUpperCase(), password: "correct horse" });
    expect(res.status).toBe(201);
    expect(res.body.student).toMatchObject({ name: "Ada", email, hasPassword: true, goals: [] });
    accessToken = res.body.accessToken;
    refreshToken = refreshTokenOf(res);

    const { rows } = await pool.query(
      `SELECT u.email, u.hashed_password, rt.token_hash
       FROM users u JOIN refresh_tokens rt ON rt.user_id = u.id WHERE u.email = $1`,
      [email],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].hashed_password).toMatch(/^\$2b\$12\$/); // bcrypt, cost 12
    expect(rows[0].token_hash).toBe(hashToken(refreshToken));
    expect(rows[0].token_hash).not.toBe(refreshToken);
  });

  it("refuses the same email again, in any capitals", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Ada 2", email: ` ADA${DOMAIN} `, password: "another one" });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("email_taken");
  });

  it("answers GET /api/me with the access token", async () => {
    const res = await request(app).get("/api/me").set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(email);
    expect(new Date(res.body.joinedAt).getTime()).not.toBeNaN();
  });

  it("changes the name with PATCH /api/me", async () => {
    const res = await request(app)
      .patch("/api/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Ada Lovelace" });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Ada Lovelace");
  });

  it("logs in with the right password and refuses a wrong one", async () => {
    const ok = await request(app).post("/api/auth/login").send({ email, password: "correct horse" });
    expect(ok.status).toBe(200);
    const bad = await request(app).post("/api/auth/login").send({ email, password: "wrong horse" });
    expect(bad.status).toBe(401);
    expect(bad.body.error.code).toBe("invalid_credentials");
  });

  it("refreshes, and pushes the stored expiry out again (it slides)", async () => {
    // Pretend the token was last used long ago: it expires in one day.
    await pool.query("UPDATE refresh_tokens SET expires_at = NOW() + INTERVAL '1 day' WHERE token_hash = $1", [
      hashToken(refreshToken),
    ]);

    const res = await request(app).post("/api/auth/refresh").set("Cookie", `refresh_token=${refreshToken}`);
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toEqual(expect.any(String));

    const { rows } = await pool.query(
      "SELECT expires_at > NOW() + INTERVAL '30 days' AS extended FROM refresh_tokens WHERE token_hash = $1",
      [hashToken(refreshToken)],
    );
    expect(rows[0].extended).toBe(true);
  });

  it("refuses an expired refresh token", async () => {
    await pool.query("UPDATE refresh_tokens SET expires_at = NOW() - INTERVAL '1 second' WHERE token_hash = $1", [
      hashToken(refreshToken),
    ]);
    const res = await request(app).post("/api/auth/refresh").set("Cookie", `refresh_token=${refreshToken}`);
    expect(res.status).toBe(401);
    // Put it back for the logout test.
    await pool.query("UPDATE refresh_tokens SET expires_at = NOW() + INTERVAL '1 day' WHERE token_hash = $1", [
      hashToken(refreshToken),
    ]);
  });

  it("logs out: the stored token is gone and refresh stops working", async () => {
    const out = await request(app).post("/api/auth/logout").set("Cookie", `refresh_token=${refreshToken}`);
    expect(out.status).toBe(204);
    const { rowCount } = await pool.query("SELECT 1 FROM refresh_tokens WHERE token_hash = $1", [
      hashToken(refreshToken),
    ]);
    expect(rowCount).toBe(0);

    const res = await request(app).post("/api/auth/refresh").set("Cookie", `refresh_token=${refreshToken}`);
    expect(res.status).toBe(401);
  });
});
