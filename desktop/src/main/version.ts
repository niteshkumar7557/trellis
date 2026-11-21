// Reading GitHub's "latest release" answer and comparing versions. Pure, so it's
// unit-tested (test/version.test.ts). updates.ts does the fetching.

/** The public repo that only holds the .dmg files (docs/desktop.md §3, the owner's choice). */
export const RELEASES_REPO = "niteshkumar7557/trellis-desktop";
export const RELEASES_PAGE = `https://github.com/${RELEASES_REPO}/releases`;
export const LATEST_RELEASE_API = `https://api.github.com/repos/${RELEASES_REPO}/releases/latest`;

/** "1.2.3" or "v1.2.3" → [1, 2, 3]; anything else (including "1.2.0-beta") → null. */
function parts(v: string): [number, number, number] | null {
  const m = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(v);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

/**
 * Is `latest` a higher version than `current`? Each part is compared as a number (as text
 * "1.10.0" would sort before "1.9.0"). Unreadable versions are never "newer": a bad tag on
 * GitHub must not nag every student.
 */
export function isNewer(latest: string, current: string): boolean {
  const a = parts(latest);
  const b = parts(current);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i]! > b[i]!;
  return false;
}

/**
 * Pick the version and the release page out of GitHub's answer, or null.
 *
 * The page URL must be one of OUR release pages: the app will open it in the browser, and
 * an answer from the network is never trusted to choose where the student is sent.
 */
export function parseLatestRelease(json: unknown): { version: string; url: string } | null {
  if (!json || typeof json !== "object") return null;
  const r = json as Record<string, unknown>;
  if (r.draft === true || r.prerelease === true) return null;
  if (typeof r.tag_name !== "string" || typeof r.html_url !== "string") return null;
  if (!r.html_url.startsWith(`${RELEASES_PAGE}/`)) return null;
  const p = parts(r.tag_name);
  return p ? { version: p.join("."), url: r.html_url } : null;
}
