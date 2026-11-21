// The update check (docs/desktop.md §7).
//
// Why not Electron's autoUpdater: on macOS it's Squirrel.Mac, which only installs updates
// into an app signed with an Apple Developer ID ($99 a year). An ad-hoc-signed app can't
// use it. So the app only CHECKS: it asks GitHub for the release repo's latest release,
// and if that's newer than this app, it says so and opens the download page. The student
// downloads and drags the new app in, as on first install.
//
// When: quietly at start and every 24 hours (a notification only if there's something
// new), and loudly from "Check for Updates…" (always a dialog, including "up to date" and
// "couldn't check").

import { app, dialog, net, Notification, shell } from "electron";
import { isNewer, LATEST_RELEASE_API, parseLatestRelease } from "./version";

const DAY = 24 * 60 * 60 * 1000;
let shown: Notification | null = null; // kept so its click handler isn't garbage-collected
let notifiedVersion: string | null = null; // the background check tells about a version once

async function latestRelease() {
  const res = await net.fetch(LATEST_RELEASE_API, {
    // GitHub's API refuses requests without a User-Agent. A generic one: nothing about
    // the student is sent, and no token (60 requests an hour per address is plenty).
    headers: { Accept: "application/vnd.github+json", "User-Agent": "Trellis-desktop" },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`GitHub answered ${res.status}`);
  const release = parseLatestRelease(await res.json());
  if (!release) throw new Error("GitHub's answer wasn't a release we recognise");
  return release;
}

export async function checkForUpdates({ quiet }: { quiet: boolean }): Promise<void> {
  const current = app.getVersion();
  let release;
  try {
    release = await latestRelease();
  } catch (err) {
    if (!quiet) dialog.showMessageBox({ type: "warning", message: "Couldn't check for updates", detail: `${(err as Error).message}. Try again later.` });
    return;
  }

  if (!isNewer(release.version, current)) {
    if (!quiet) dialog.showMessageBox({ type: "info", message: "You're up to date", detail: `Trellis ${current} is the latest version.` });
    return;
  }

  if (quiet) {
    if (notifiedVersion === release.version || !Notification.isSupported()) return;
    notifiedVersion = release.version;
    shown = new Notification({ title: `Trellis ${release.version} is available`, body: "Click to download it." });
    shown.on("click", () => shell.openExternal(release.url));
    shown.show();
    return;
  }

  const { response } = await dialog.showMessageBox({
    type: "info",
    message: `Trellis ${release.version} is available`,
    detail: `You have ${current}. Download the new version, then drag it into Applications to replace this one.`,
    buttons: ["Download", "Later"],
    defaultId: 0,
    cancelId: 1,
  });
  if (response === 0) shell.openExternal(release.url);
}

/** The quiet checks: once now, then once a day while the app runs. */
export function startUpdateChecks(): void {
  // The e2e tests switch the background check off, so they never depend on GitHub.
  if (!app.isPackaged && process.env.TRELLIS_UPDATES === "off") return;
  checkForUpdates({ quiet: true });
  setInterval(() => checkForUpdates({ quiet: true }), DAY);
}
