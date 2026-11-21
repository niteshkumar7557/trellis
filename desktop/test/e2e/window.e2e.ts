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
    // Like the real site's search (frontend/components/app/Search.tsx), it reacts to ⌘K.
    res.end(`<!doctype html><title>Fake Trellis</title><a id="out" href="https://example.com/">out</a>
      <script>addEventListener("keydown", (e) => { if (e.metaKey && e.key.toLowerCase() === "k") document.title = "Search open"; });</script>`);
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

test("the Go menu opens the sidebar's pages", async () => {
  const app = await launch(siteUrl);
  const page = await app.firstWindow();
  await expect(page).toHaveTitle("Fake Trellis");
  await app.evaluate(({ Menu }) => {
    const go = Menu.getApplicationMenu()!.items.find((i) => i.label === "Go")!;
    go.submenu!.items.find((i) => i.label === "Check-ins")!.click();
  });
  await expect(page).toHaveURL(`${siteUrl}/check-ins`);
  await app.close();
});

test("⌃⌥T is registered, and it opens the site's search", async () => {
  const app = await launch(siteUrl);
  const page = await app.firstWindow();
  await expect(page).toHaveTitle("Fake Trellis");
  expect(await app.evaluate(({ globalShortcut }) => globalShortcut.isRegistered("Control+Alt+T"))).toBe(true);

  // Pressing real keys system-wide from a test isn't possible, so call what the shortcut
  // calls: the same "Search…" item the menu bar and the tray use.
  await app.evaluate(({ Menu }) => {
    const view = Menu.getApplicationMenu()!.items.find((i) => i.label === "View")!;
    view.submenu!.items.find((i) => i.label === "Search…")!.click();
  });
  await expect(page).toHaveTitle("Search open");
  await app.close();
});
