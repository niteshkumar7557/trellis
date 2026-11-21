// The secure window, checked from outside: launch the app against a tiny local "site" and
// prove the page can't do what docs/desktop.md §4 says it can't.

import { _electron as electron, expect, test, type ElectronApplication } from "@playwright/test";
import { mkdtempSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";

// A stand-in for the Trellis site: every path answers the same small page.
let site: Server;
let siteUrl = "";
test.beforeAll(async () => {
  site = createServer((_req, res) => {
    res.writeHead(200, { "content-type": "text/html" });
    res.end(`<!doctype html><title>Fake Trellis</title><a id="out" href="https://example.com/">out</a>`);
  });
  await new Promise<void>((resolve) => site.listen(0, "127.0.0.1", resolve));
  const addr = site.address();
  siteUrl = `http://127.0.0.1:${typeof addr === "object" && addr ? addr.port : 0}`;
});
test.afterAll(() => site.close());

async function launch(url: string): Promise<ElectronApplication> {
  return electron.launch({
    args: [join(__dirname, "..", "..")],
    env: { ...process.env, TRELLIS_URL: url, TRELLIS_USER_DATA: mkdtempSync(join(tmpdir(), "trellis-e2e-")) },
  });
}

test("the page runs with no Node and only the small bridge", async () => {
  const app = await launch(siteUrl);
  const page = await app.firstWindow();
  await expect(page).toHaveTitle("Fake Trellis");

  // What main set on the window (read from the main process itself).
  const prefs = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]!.webContents.getLastWebPreferences());
  expect(prefs).toMatchObject({ contextIsolation: true, sandbox: true, nodeIntegration: false });

  // What the page can see.
  expect(await page.evaluate(() => typeof (window as any).require)).toBe("undefined");
  expect(await page.evaluate(() => typeof (window as any).process)).toBe("undefined");
  expect(await page.evaluate(() => Object.keys((window as any).trellisDesktop).sort())).toEqual(["isDesktop", "retry"]);
  await app.close();
});

test("the window can't be taken to another site, and no pop-up window opens", async () => {
  const app = await launch(siteUrl);
  const page = await app.firstWindow();
  await expect(page).toHaveTitle("Fake Trellis");

  // Stop the test from really opening a browser: record the call instead.
  await app.evaluate(({ shell }) => {
    (globalThis as any).opened = [];
    shell.openExternal = async (url: string) => void (globalThis as any).opened.push(url);
  });

  await page.evaluate(() => (location.href = "https://example.com/"));
  await page.evaluate(() => window.open("https://example.org/"));
  await page.waitForTimeout(500);

  expect(page.url()).toBe(`${siteUrl}/map`);
  expect(await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length)).toBe(1);
  expect(await app.evaluate(() => (globalThis as any).opened)).toEqual(["https://example.com/", "https://example.org/"]);
  await app.close();
});

test("the site may write to the clipboard, and nothing else is granted", async () => {
  const app = await launch(siteUrl);
  const page = await app.firstWindow();
  await expect(page).toHaveTitle("Fake Trellis");
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]!.focus()); // clipboard needs a focused page

  // "Copy prompt" is the product's main action; it must keep working in the app.
  await page.evaluate(() => navigator.clipboard.writeText("a prompt"));
  expect(await app.evaluate(({ clipboard }) => clipboard.readText())).toBe("a prompt");

  // Anything that needs a permission is refused.
  const camera = await page.evaluate(() =>
    navigator.mediaDevices.getUserMedia({ video: true }).then(() => "granted", (e: Error) => e.name),
  );
  expect(camera).toBe("NotAllowedError");
  expect(await page.evaluate(() => navigator.permissions.query({ name: "geolocation" }).then((p) => p.state))).toBe("denied");
  await app.close();
});

test("an unreachable site shows the offline page", async () => {
  // Port 9 ("discard") on loopback: nothing listens, so the connection is refused at once.
  const app = await launch("http://127.0.0.1:9");
  const page = await app.firstWindow();
  await expect(page).toHaveTitle("Can't reach Trellis");
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  await app.close();
});
