// The forgotten-password flow against the real Postgres: the admin makes a link with
// makeResetLink() (what `npm run reset-link` runs), and the student spends it through
// POST /api/auth/reset-password.

import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import app from "../../src/app.js";
import pool from "../../src/db/index.js";
import { makeResetLink } from "../../src/db/reset-link.js";

const DOMAIN = "@it-reset.trellis.test";
const email = `grace${DOMAIN}`;
const cleanUp = () => pool.query("DELETE FROM users WHERE email LIKE $1", [`%${DOMAIN}`]);

const tokenOf = (link: string) => new URL(link).searchParams.get("token")!;
const login = (password: string) => request(app).post("/api/auth/login").send({ email, password });
const reset = (token: string, password: string) =>
  request(app).post("/api/auth/reset-password").send({ token, password });

beforeAll(cleanUp);
beforeEach(async () => {
  await cleanUp();
  const res = await request(app)
    .post("/api/auth/register")
    .send({ name: "Grace", email, password: "old password" });
  expect(res.status).toBe(201);
});
afterAll(async () => {
  await cleanUp();
  await pool.end();
});

describe("reset links", () => {
  it("returns null for an email with no account", async () => {
    expect(await makeResetLink(`nobody${DOMAIN}`)).toBeNull();
  });

  it("finds the account whatever the capitals, and builds the link from PUBLIC_URL", async () => {
    const link = await makeResetLink(`  GRACE${DOMAIN} `);
    expect(link).toMatch(/\/reset\?token=[0-9a-f]{64}$/);
  });

  it("sets the new password, signs out every device, and works only once", async () => {
    const link = (await makeResetLink(email))!;

    const res = await reset(tokenOf(link), "new password");
    expect(res.status).toBe(204);

    expect((await login("old password")).status).toBe(401);
    expect((await login("new password")).status).toBe(200);

    // The session from sign-up (made before the reset) is gone; only the login above remains.
    const { rows } = await pool.query(
      "SELECT count(*)::int AS n FROM refresh_tokens rt JOIN users u ON u.id = rt.user_id WHERE u.email = $1",
      [email],
    );
    expect(rows[0].n).toBe(1);

    const again = await reset(tokenOf(link), "third password");
    expect(again.status).toBe(400);
    expect(again.body.error.code).toBe("reset_link_invalid");
  });

  it("refuses an expired link and leaves the password alone", async () => {
    const link = (await makeResetLink(email))!;
    await pool.query(
      "UPDATE password_resets SET expires_at = NOW() - INTERVAL '1 second' WHERE user_id = (SELECT id FROM users WHERE email = $1)",
      [email],
    );
    expect((await reset(tokenOf(link), "new password")).status).toBe(400);
    expect((await login("old password")).status).toBe(200);
  });

  it("cancels the older link when the admin makes a new one", async () => {
    const first = (await makeResetLink(email))!;
    const second = (await makeResetLink(email))!;
    expect((await reset(tokenOf(first), "new password")).status).toBe(400);
    expect((await reset(tokenOf(second), "new password")).status).toBe(204);
  });

  it("only ever stores the token's hash", async () => {
    const link = (await makeResetLink(email))!;
    const { rowCount } = await pool.query("SELECT 1 FROM password_resets WHERE token_hash = $1", [tokenOf(link)]);
    expect(rowCount).toBe(0);
  });
});
