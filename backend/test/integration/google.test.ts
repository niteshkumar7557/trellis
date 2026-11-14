// The Google account rule against the real Postgres (backend-design.md §4): find by
// Google id, else link to the account with that email, else create one.

import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import app from "../../src/app.js";
import pool from "../../src/db/index.js";
import { signInWithGoogle } from "../../src/repos/users.repo.js";
import { deleteUsers } from "./helpers.js";

const DOMAIN = "@it-google.trellis.test";
const row = async (email: string) =>
  (
    await pool.query(
      `SELECT id, name, google_sub, email_verified_at IS NOT NULL AS verified, hashed_password IS NOT NULL AS has_password,
              (SELECT count(*)::int FROM refresh_tokens r WHERE r.user_id = u.id) AS sessions
       FROM users u WHERE email = $1`,
      [email],
    )
  ).rows[0];

beforeAll(() => deleteUsers(DOMAIN));
afterAll(async () => {
  await deleteUsers(DOMAIN);
  await pool.end();
});

describe("signInWithGoogle", () => {
  it("creates a new account with no password and a verified email, named from Google", async () => {
    const id = await signInWithGoogle({ sub: "g-new", email: `new${DOMAIN}`, name: "New Person" });
    expect(await row(`new${DOMAIN}`)).toMatchObject({ id, name: "New Person", google_sub: "g-new", verified: true, has_password: false });
  });

  it("signs the same Google account in again, even if its email changed at Google", async () => {
    const first = await signInWithGoogle({ sub: "g-same", email: `same${DOMAIN}`, name: null });
    const again = await signInWithGoogle({ sub: "g-same", email: `renamed${DOMAIN}`, name: null });
    expect(again).toBe(first);
    expect((await row(`same${DOMAIN}`)).name).toBe("same"); // no Google name: the email's first part
  });

  it("links to a password account that never verified its email, removing the password and its sessions", async () => {
    const email = `squatted${DOMAIN}`;
    await request(app).post("/api/auth/register").send({ name: "Someone", email, password: "chosen by someone" });
    expect(await row(email)).toMatchObject({ has_password: true, verified: false, sessions: 1 });

    await signInWithGoogle({ sub: "g-owner", email, name: "Real Owner" });
    expect(await row(email)).toMatchObject({ google_sub: "g-owner", verified: true, has_password: false, sessions: 0 });
    // The password set by whoever registered first no longer works.
    expect((await request(app).post("/api/auth/login").send({ email, password: "chosen by someone" })).status).toBe(401);
  });

  it("links to an account whose email was already verified, keeping its password", async () => {
    const email = `verified${DOMAIN}`;
    await request(app).post("/api/auth/register").send({ name: "Owner", email, password: "my own password" });
    await pool.query("UPDATE users SET email_verified_at = NOW() WHERE email = $1", [email]);

    await signInWithGoogle({ sub: "g-verified", email, name: null });
    expect(await row(email)).toMatchObject({ google_sub: "g-verified", has_password: true, sessions: 1 });
  });
});
