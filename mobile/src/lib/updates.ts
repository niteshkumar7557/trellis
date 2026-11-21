// The update check (docs/mobile.md §3): the APK isn't in the Play Store, so nothing updates
// it automatically. The app asks GitHub for the latest release of the public
// niteshkumar7557/trellis-android repo and, when it's newer than this copy, offers the
// download. Installing it is the student's own step (Android asks them to confirm).
//
// GitHub's public API, unauthenticated: 60 calls an hour per network address, plenty for a
// check when Settings opens. When it fails (offline, rate-limited) the app says so and
// carries on; it never blocks anything.

import * as Application from "expo-application";

export const RELEASES_URL = "https://github.com/niteshkumar7557/trellis-android/releases/latest";
const API = "https://api.github.com/repos/niteshkumar7557/trellis-android/releases/latest";

/** "1.10.0" > "1.9.0": compared part by part as numbers, not as text. */
export function isNewer(a: string, b: string): boolean {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d > 0;
  }
  return false;
}

export interface Release {
  version: string;
  page: string;
  /** The .apk's direct link, or null when the release has none attached. */
  apk: string | null;
}

/** GitHub's answer → a Release, or null for anything that isn't one (an error message). */
export function readRelease(json: unknown): Release | null {
  const r = json as { tag_name?: unknown; html_url?: unknown; assets?: { name?: string; browser_download_url?: string }[] };
  if (typeof r?.tag_name !== "string" || typeof r.html_url !== "string") return null;
  const version = r.tag_name.replace(/^v/, "");
  if (!/^\d+\.\d+\.\d+$/.test(version)) return null;
  const apk = (r.assets ?? []).find((a) => a.name?.endsWith(".apk"))?.browser_download_url ?? null;
  return { version, page: r.html_url, apk };
}

/** This copy's version (app.config.ts VERSION). */
export const installedVersion = (): string => Application.nativeApplicationVersion ?? "0.0.0";

/** The newer release, null when up to date. Throws when GitHub can't be asked. */
export async function checkForUpdate(): Promise<Release | null> {
  const res = await fetch(API, { headers: { Accept: "application/vnd.github+json" } });
  const release = readRelease(await res.json());
  if (!release) throw new Error("No release found");
  return isNewer(release.version, installedVersion()) ? release : null;
}
