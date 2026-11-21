// The two URL checks the whole app's safety rests on (docs/desktop.md §4).
//
// Pure functions with no `electron` import, so they're unit-tested in plain Node.
//
// Why compare ORIGINS and never strings: `url.startsWith("https://trellis.niteshkumar.xyz")`
// says yes to "https://trellis.niteshkumar.xyz.evil.test" and to
// "https://trellis.niteshkumar.xyz@evil.test" (the part before @ is a user name, the host
// is evil.test). `new URL(...)` parses the address the same way Chromium will, and its
// `origin` (scheme + host + port) is exactly what the browser's own security rules use.

/** May this URL load inside the Trellis window? Only pages of the site itself. */
export function isAllowedUrl(url: string, origin: string): boolean {
  try {
    return new URL(url).origin === origin;
  } catch {
    return false; // not a URL at all
  }
}

/**
 * May this URL be handed to macOS to open (in the default browser)?
 *
 * Only web links. `shell.openExternal` passes the URL to the OS, and the OS will happily
 * open `file:` paths, run app schemes (`smb:`, `ssh:`, our own `trellis:`) or start other
 * programs. A link on a page must never be able to do that.
 */
export function isExternalSafe(url: string): boolean {
  try {
    const { protocol } = new URL(url);
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}
