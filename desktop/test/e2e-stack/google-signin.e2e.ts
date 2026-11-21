// Google sign-in in the desktop app, end to end against the local stack (docs/desktop.md §5).
//
// Everything is real except Google itself (a test can't sign in to Google). The test
// stands in for the callback: it stores the one-time code with the challenge the app
// sent, exactly as googleCallback would. From there it's all the real thing: the
// trellis:// link, the app's verifier, the exchange, the cookie in the window's store, and
// the site's own start-up turning it into a signed-in student.

import { _electron as electron, expect, test, type ElectronApplication } from "@playwright/test";
import { createHash, randomBytes } from "node:crypto";
import { mkdtempSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SITE = "http://localhost:3000";
const API = "http://localhost:8000";
const backend = join(__dirname, "..", "..", "..", "backend");

// The backend's own Postgres client and its DB_URL from backend/.env.
const { Pool } = createRequire(join(backend, "package.json"))("pg");
const dbUrl = /^DB_URL=(.*)$/m.exec(readFileSync(join(backend, ".env"), "utf8"))![1]!.trim();
const pool = new Pool({ connectionString: dbUrl });
const DOMAIN = "@e2e-desktop.trellis.test";

let userId: number;
test.beforeAll(async () => {
  await pool.query("DELETE FROM users WHERE email LIKE $1", [`%${DOMAIN}`]);
  const res = await fetch(`${API}/api/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Desk Top", email: `desk-${Date.now()}${DOMAIN}`, password: "correct horse" }),
  });
  if (res.status !== 201) throw new Error(`register failed (${res.status}): is the backend running on :8000?`);
  userId = Number((await res.json()).student.id);
});
test.afterAll(async () => {
  await pool.query("DELETE FROM users WHERE email LIKE $1", [`%${DOMAIN}`]);
  await pool.end();
});

async function launch(): Promise<ElectronApplication> {
  const app = await electron.launch({
    args: [join(__dirname, "..", "..")],
    env: { ...process.env, TRELLIS_UPDATES: "off", TRELLIS_URL: SITE, TRELLIS_USER_DATA: mkdtempSync(join(tmpdir(), "trellis-e2e-")) },
  });
  // Record what would open in the browser instead of opening it.
  await app.evaluate(({ shell }) => {
    (globalThis as any).opened = [];
    shell.openExternal = async (url: string) => void (globalThis as any).opened.push(url);
  });
  return app;
}

/** Deliver a link the way macOS does. */
const openLink = (app: ElectronApplication, url: string) =>
  app.evaluate(({ app }, u) => app.emit("open-url", { preventDefault() {} }, u), url);

const refreshCookie = (app: ElectronApplication) =>
  app.evaluate(async ({ session }, site) => (await session.defaultSession.cookies.get({ url: `${site}/api/auth`, name: "refresh_token" })).length, SITE);

test("Continue with Google opens the browser with a challenge, and the link signs the app in", async () => {
  const app = await launch();
  const page = await app.firstWindow();
  await page.waitForLoadState("domcontentloaded");

  // 1. The page's Google link: caught, sent to the browser with ?desktop=<challenge>.
  await page.evaluate(() => (location.href = "/api/auth/google"));
  await expect.poll(() => app.evaluate(() => (globalThis as any).opened.length)).toBe(1);
  const opened = new URL(await app.evaluate(() => (globalThis as any).opened[0]));
  expect(`${opened.origin}${opened.pathname}`).toBe(`${SITE}/api/auth/google`);
  const challenge = opened.searchParams.get("desktop")!;
  expect(challenge).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(page.url()).not.toContain("/api/auth/google"); // the window stayed put

  // 2. Stand in for Google + the callback: a one-time code bound to THAT challenge.
  const code = randomBytes(32).toString("hex");
  await pool.query(
    "INSERT INTO desktop_handoffs (code_hash, user_id, challenge, expires_at) VALUES ($1, $2, $3, NOW() + interval '2 minutes')",
    [createHash("sha256").update(code).digest("hex"), userId, challenge],
  );

  // 3. The browser's trellis:// link reaches the app.
  expect(await refreshCookie(app)).toBe(0);
  await openLink(app, `trellis://auth?code=${code}`);

  // 4. Signed in: the cookie is in the window's store, the code is spent, and the site's
  // /auth/done sends a student with no goal yet on to /start.
  await expect(page).toHaveURL(`${SITE}/start`, { timeout: 20_000 });
  expect(await refreshCookie(app)).toBe(1);
  const { rows } = await pool.query("SELECT used_at FROM desktop_handoffs WHERE user_id = $1", [userId]);
  expect(rows[0].used_at).not.toBeNull();
  await app.close();
});

test("a sign-in link the app didn't ask for is ignored", async () => {
  const app = await launch();
  const page = await app.firstWindow();
  await page.waitForLoadState("domcontentloaded");
  const before = page.url();

  // A real, valid code for a real account, but this app never started a sign-in: it must
  // not even try it (no login CSRF).
  const code = randomBytes(32).toString("hex");
  await pool.query(
    "INSERT INTO desktop_handoffs (code_hash, user_id, challenge, expires_at) VALUES ($1, $2, $3, NOW() + interval '2 minutes')",
    [createHash("sha256").update(code).digest("hex"), userId, "x".repeat(43)],
  );
  await openLink(app, `trellis://auth?code=${code}`);
  await page.waitForTimeout(1500);

  expect(page.url()).toBe(before);
  expect(await refreshCookie(app)).toBe(0);
  const { rows } = await pool.query("SELECT used_at FROM desktop_handoffs WHERE code_hash = $1", [createHash("sha256").update(code).digest("hex")]);
  expect(rows[0].used_at).toBeNull();
  await app.close();
});

test("trellis://open/map opens the map", async () => {
  const app = await launch();
  const page = await app.firstWindow();
  await page.waitForLoadState("domcontentloaded");
  await page.evaluate(() => history.replaceState(null, "", "/settings"));
  await openLink(app, "trellis://open/map");
  await expect(page).toHaveURL(`${SITE}/map`);
  await app.close();
});
