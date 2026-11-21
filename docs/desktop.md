# The Trellis desktop app (macOS)

A Mac app for Trellis, built with **Electron**. It opens the live site
(https://trellis.niteshkumar.xyz) in a locked-down window and adds what a browser tab
can't: a menu, a menu-bar icon, notifications, a shortcut that works from any app, Google
sign-in through the system browser, and an update check.

It's a graded university elective (21 Nov 2026). The owner must explain every decision in
a viva, so every choice below names the alternatives and the trade-off.

Status: **1.0.1 released, 21 Nov 2026** (1.0.0 the same day; design approved by the owner
that morning). Download: https://github.com/niteshkumar7557/trellis-desktop/releases/latest,
linked from the landing page's footer and from Settings (§13 lists what 1.0.1 changed).

---

## 1. What it is, and what it isn't

- **Is:** a native Mac wrapper around the real site, with real desktop features. Every
  screen, rule and record is the site's; the app adds nothing to the product.
- **Isn't:** a second frontend. The app never bundles the Next.js code; it loads the site.
- **Isn't:** offline Trellis. Without a connection it shows a "can't reach Trellis" page
  with a Retry button, because every record lives in Postgres behind the API.

**Constraints**

- macOS on **Apple Silicon (arm64) only**: one build, the owner's own machine type.
- **$0.** No Apple Developer Program ($99 a year), so no Developer ID certificate and no
  notarization. The app is **ad-hoc signed** (see §6).
- Nothing changes for students using the site in a browser.

---

## 2. Electron in five minutes

Electron is Chromium (the browser engine) plus Node.js, in one app. An Electron app has
two kinds of process:

| Process | What it is | In Trellis |
|---|---|---|
| **Main** | One Node.js program that owns the app: windows, menus, tray, notifications, shortcuts, the file system. It has full access to the Mac. | `desktop/src/main/` |
| **Renderer** | One Chromium page per window, like a browser tab. | the live Trellis site |

Because the renderer here shows a **website** (code that comes over the network), it must
**never** get Node.js or Electron APIs. A third, tiny piece sits between them:

| Piece | What it is |
|---|---|
| **Preload script** | Runs inside the renderer, before the page, in its own isolated world. It hands the page a small, fixed set of functions through `contextBridge`. |
| **IPC** | Messages between the renderer and main (`ipcRenderer` ↔ `ipcMain`). The preload's functions are thin wrappers around these messages. |

That's the whole security model: the site can only ask main to do the few things the
preload exposes, and main checks every request.

---

## 3. Approaches considered

**Load the live site (chosen)** vs **bundle the frontend inside the app**

- *Bundling* would work with no network for the page itself, but the API needs the network
  anyway, and it means a second copy of the site to build, ship and keep in step. Every
  site fix would need a new `.dmg`.
- *Loading the live site* means the app is always on the current release, the same as
  the browser. The cost is that the app's safety depends on locking the window down (§4),
  because it shows remote code.

**Packaging: electron-builder (chosen)** vs **Electron Forge** vs **by hand**

- *electron-builder:* one config block makes the `.app`, signs it (ad-hoc), writes the URL
  scheme into `Info.plist`, flips the Fuses, and makes the `.dmg`. Most used in practice.
- *Electron Forge:* the official tool; also fine, but the same result needs a maker, a
  fuses plugin and more config spread over files.
- *By hand* (`@electron/packager` + `hdiutil`): good for learning, too much to maintain.

**Language: TypeScript compiled by `tsc` (chosen)** vs **plain JS** vs **a Vite template**

- The rest of the repo is strict TypeScript; the owner already reads it.
- `tsc` is the only build step: no bundler hiding what runs. Plain JS would be one step
  fewer, with no type checks on Electron's large API. A Vite/Forge template adds hot reload
  but a lot of setup the owner would have to debug.

**Google sign-in: the system browser with a deep link (chosen)** vs **inside the app** vs
**a loopback server** (details in §5)

**Updates: a check that points to the download (chosen)** vs **Electron's auto-updater**

- Electron's `autoUpdater` (Squirrel.Mac) **only works on a Developer ID-signed app**. At
  $0 that's impossible, so the app checks for a new version and sends the student to
  download it.

**Hosting the `.dmg`: a public GitHub repo used only for releases (owner's choice)** vs
S3 behind CloudFront vs the site's `public/` folder

- Free, the normal place for app downloads, and the private code stays private.
- S3 would use AWS credit and need an AWS change; `public/` would add ~100 MB to the
  site's Docker image per release and tie app releases to site releases.

---

## 4. The secure window

The window shows remote content, so it follows Electron's security checklist. Each line
says what it stops.

| Setting or check | What it stops |
|---|---|
| `contextIsolation: true` | The page touching the preload's variables or Electron's objects. |
| `sandbox: true` | The renderer using Node.js at all; it runs like a normal Chrome tab. |
| `nodeIntegration: false` | `require("fs")` from the page. |
| `webSecurity` left on | Turning off the same-origin rules. |
| **Navigation allow-list**: only `https://trellis.niteshkumar.xyz` may load in the window (`will-navigate`, `will-redirect`) | A link or redirect taking the trusted window to another site. |
| **New windows**: `setWindowOpenHandler` denies all; `http(s)` links open in the default browser with `shell.openExternal` | Pop-ups inside the app; and nothing but `http(s)` is ever passed to the OS. |
| **Permissions**: every request (camera, microphone, location, …) is refused, except writing to the clipboard from the site itself | The site, or anything injected into it, using the Mac's hardware. The one exception is because "Copy prompt" uses `navigator.clipboard`, which Chromium treats as a permission. |
| **IPC checks**: main answers a message only if it came from the main window's frame and the frame's URL is on the allow-list | A stray frame calling the bridge. |
| A small preload API: about five functions, each taking plain values | The page reaching anything else. |
| **Electron Fuses** (set when packaging): no `RunAsNode`, no `NODE_OPTIONS`, no `--inspect`, cookies encrypted, app code only from the signed `asar` with integrity checking | Someone using the installed app as a general Node.js runner, or swapping its code. |
| **Single instance** (`requestSingleInstanceLock`) | Two copies running; also needed so a deep link reaches the copy that's open. |

**Where it falls short of production:** without notarization Apple hasn't scanned the app,
and the ad-hoc signature only proves the app hasn't changed since it was built, not who
built it (§6).

**Small things the window also does:** it remembers its size and position (a JSON file in
the app's data folder); it opens `/map` for a student with a session and `/login` for anyone
else (`start-path.ts`, since 1.0.1; 1.0.0 always opened `/map`, which left a signed-out
student on the sample student with no way to log in); it shows a bundled offline page when
the site can't be reached.

---

## 5. Google sign-in through the system browser

### Why not inside the app

- **Google blocks it.** Google refuses OAuth in embedded browsers (`disallowed_useragent`).
- **It's unsafe even if it worked.** The app owns the window, so it could read the password
  as it's typed. Users should type a Google password only in a browser they trust. This is
  the rule in **RFC 8252** ("OAuth 2.0 for Native Apps").

### The problem with just opening the browser

Today Google's callback sets the refresh cookie **in the browser that did the sign-in**.
Open Google in Safari and Safari ends up signed in, not the app. So the browser has to hand
the sign-in back to the app.

### The flow (RFC 8252 with PKCE)

```
App (main)                       System browser                     Backend
──────────                       ──────────────                     ───────
1. make a random secret
   (the "verifier"), keep it in
   memory; challenge = SHA-256
   of it
2. open ───────────────────────► GET /api/auth/google?desktop=<challenge>
                                                             ──────► state cookie + challenge
                                                                    cookie; 302 to Google
                                 (signs in at Google as usual)
                                 GET /api/auth/google/callback ────► verify the Google ID token,
                                                                    find or create the account,
                                                                    store a ONE-TIME CODE
                                                                    (hash only, 2 minutes,
                                                                    with the challenge); no
                                                                    session in the browser
                                 302 → /auth/desktop?code=…
                                 page: "Opening Trellis…"
                                 opens trellis://auth?code=…
3. macOS hands the link to the
   app (`open-url`)
4. POST /api/auth/desktop/exchange {code, verifier}  ──────────────► code unused and unexpired?
   sent with the window's own                                       SHA-256(verifier) equals
   cookie store                                                     the stored challenge?
                                                                    mark used; set the refresh
                                                                    cookie; {accessToken}
5. load /auth/done in the window
   (the site's normal start-up
   refresh turns the cookie into
   a signed-in map)
```

**How the app starts it without changing the sign-in page:** the site's "Continue with
Google" is a plain link to `/api/auth/google`. In the app, main's `will-navigate` handler
sees that navigation, cancels it, and does step 2 in the system browser instead. In a
normal browser nothing changes.

**How step 4 lands the cookie in the app:** main sends the POST with the window's own
session (`session.defaultSession.fetch`), so the `Set-Cookie` in the answer goes into the
same cookie store the window uses, exactly as if the page had signed in.

**Why the verifier (PKCE) is needed:** on macOS **any** app can register `trellis://`. If a
malicious app grabbed the link, it would get the code but not the verifier, which never
left our app's memory. The code alone is useless.

**Why a page in the middle (`/auth/desktop`), not a redirect straight to `trellis://`:**
the browser asks "Open Trellis?" and a blank tab is left behind either way; the page says
what's happening, has an "Open Trellis" button if the prompt was dismissed, and says the
tab can be closed.

**Alternatives rejected**

- *Loopback redirect* (the app runs a tiny web server on `127.0.0.1` and Google sends the
  browser there): another standard RFC 8252 option. It needs a second Google client of
  type "Desktop", and the backend would have to accept tokens from the app. The owner asked
  for a deep link, and the backend already does the Google part well.
- *Put the refresh token itself in the deep link:* anyone who intercepts the link gets a
  60-day session. A short one-time code plus PKCE limits the damage to nothing.

**Email and password** sign-in needs no change: the window loads the site's own origin,
so the `SameSite=Strict` refresh cookie works as it does in a browser.

### The backend change (approved by the owner, 21 Nov 2026)

- Migration `0020_desktop_handoffs.sql`: `desktop_handoffs (code_hash, user_id, challenge,
  expires_at, used_at)`. Only the SHA-256 of the code is stored, like refresh tokens.
- `GET /api/auth/google?desktop=<challenge>`: validates the challenge (43 base64url
  characters) and keeps it in a second short-lived cookie next to `state`.
- `GET /api/auth/google/callback`: with a challenge, stores a hand-off and redirects to
  `/auth/desktop?code=…`; without one, behaves exactly as today.
- `POST /api/auth/desktop/exchange {code, verifier}`: one `UPDATE … RETURNING` marks the
  code used only if it's unused, unexpired and the verifier matches, so it can't be used
  twice even by two requests at once. Rate-limited like login. Answers like login.
- Frontend: the `/auth/desktop` page.
- Unit and integration tests; CI; then a production release, before the desktop app's
  Google button can work against the live site.

---

## 6. Signing, Gatekeeper and installing

**Ad-hoc signing** (`mac.identity: "-"`): a signature made without any certificate.
Apple Silicon refuses to run unsigned code at all, so some signature is required; ad-hoc
proves the bundle hasn't changed since it was signed, not who made it.

**The hardened runtime stays on.** It stops other programs injecting code into the app or
tampering with its memory. Two of its rules have to be relaxed, each with an
**entitlement** (a permission baked into the signature, in `entitlements.mac.plist`):

- `com.apple.security.cs.allow-jit`: V8 compiles JavaScript to machine code while it
  runs, which needs memory that is written and then executed. Without it the app dies at
  launch with "Failed to reserve virtual memory for CodeRange". The first packaged build
  did exactly that (21 Nov 2026); running from source hid it, because the development
  Electron doesn't use the hardened runtime. It's the narrow form; the broader
  `allow-unsigned-executable-memory` isn't needed.
- `com.apple.security.cs.disable-library-validation`: the hardened runtime loads only
  code signed by the app's own team. Electron's frameworks carry Electron's team
  signature and an ad-hoc app has no team, so without this they can't be loaded. A
  Developer ID-signed app wouldn't need it.

The alternative to both, turning the hardened runtime off, would drop every other
protection it gives.

**What a student sees:** a downloaded, un-notarized app is blocked the first time
("Apple could not verify…"). The fix is **System Settings → Privacy & Security → Open
Anyway**, once. The release notes and this doc say so. Removing that step costs the
$99-a-year Developer Program; that's the production answer.

---

## 7. Desktop features

| Feature | What it does | Electron API |
|---|---|---|
| **Menu** | The standard Mac menus (Trellis, Edit, View, Window, Help) plus **Go**: Map ⌘1, Check-ins ⌘2, Settings ⌘3 (the site's sidebar; changed from "Start" while building, 21 Nov 2026: Start is the one-time setup page). View: Search…, reload, zoom. Trellis menu: **Check for Updates…** | `Menu`, `MenuItem` roles |
| **Tray** (menu-bar icon) | Show Trellis, Search, Check for Updates, Quit | `Tray`, a template image |
| **Notifications** | Only **"Trellis X is available"**, from the update check; clicking it opens the download page. (1.0.0 also had a daily study reminder; 1.0.1 removed it, see §13.) | `Notification` |
| **Global shortcut** | **⌃⌥T** from any app: bring Trellis to the front and open search (the site's ⌘K). Not ⌘⇧T, which every browser uses for "reopen tab". | `globalShortcut`, `webContents.sendInputEvent` |
| **Deep links** | `trellis://auth?code=…` (sign-in, §5) and `trellis://open/map`. Anything else is ignored. | `open-url`, `CFBundleURLTypes` |
| **Update check** | At start, once a day and from the menu: ask GitHub for the release repo's latest release, compare its version with `app.getVersion()`, and if newer, notify and offer to open the download page. | `net.fetch`, `shell.openExternal` |

**Update check details (my call, within the owner's choice):** the app reads the release
repo's "latest release" from GitHub's public API instead of a `latest.json` on the site.
Publishing a GitHub release is then the whole release; no site release needed. GitHub
allows 60 unauthenticated calls an hour per address, far more than a daily check needs.
The release repo must be **public**; the owner creates it (an outward-facing step, so it
waits for the owner's say-so).

**Settings the app keeps** (the window's position): a small JSON file
in `app.getPath("userData")`. Not `electron-store`: the needs are tiny and one file with
`JSON.parse` is easier to debug.

---

## 8. Icons and the no-raster rule

Trellis's rule is "every picture is SVG drawn in code". macOS needs bitmaps for two things:
the app icon (`.icns`) and the menu-bar icon (a PNG "template image", black on clear, that
macOS tints for light and dark). The same exception the site already makes for its
build-time PNGs applies: **the SVG source lives in code** (from `components/brand/`), and
a build script turns it into the PNGs and `.icns` (with macOS's own `iconutil`). No
bitmap is drawn by hand or committed as the source.

---

## 9. Layout of `desktop/`

```
desktop/
  package.json             scripts; dev dependencies only (Electron is the runtime)
  tsconfig.json            one config, CommonJS (a sandboxed preload can't be an ES module)
  electron-builder.yml     how the .app and .dmg are made: signing, Fuses, URL scheme (§6)
  entitlements.mac.plist   allow-jit + disable-library-validation (§6)
  src/
    main/                  the main process, one file per job
      index.ts             start-up: single instance, open-url, permissions, ready
      config.ts            the site's origin (TRELLIS_URL only from source)
      window.ts            the secure window (§4), showPath, openSearch, the offline page
      security.ts          isAllowedUrl, isExternalSafe            (pure, unit-tested)
      settings.ts          the JSON settings file                  (pure, unit-tested)
      menu-template.ts     the Go items, the shortcut, AppActions  (pure, unit-tested)
      menu.ts  tray.ts  shortcut.ts
      start-path.ts        the first page: map or Log in            (pure, unit-tested)
      version.ts           version compare, GitHub's answer         (pure, unit-tested)
      updates.ts           the update check
      deeplink.ts          parse trellis:// links, the start-up queue (pure, unit-tested)
      pkce.ts              verifier and challenge                   (pure, unit-tested)
      auth.ts              Google sign-in: start in the browser, finish from the link
    preload/index.ts       the bridge (§2): isDesktop, retry
    offline.html           "Can't reach Trellis"
  scripts/icons.ts         SVG mark → app icon (.icns) and tray PNGs (§8)
  test/                    unit tests (vitest, plain Node)
  test/e2e/                Playwright: the real app against a fake local site
  test/e2e-stack/          Playwright: the real app against the local Trellis stack
```

Generated and git-ignored: `dist/` (compiled code), `build/` and `assets/` (icons),
`release/` (the `.app` and `.dmg`).

**Why "pure" files:** anything that decides something (is this URL allowed, is this
version newer, which page opens first, is this link valid) lives in a file with no
`electron` import. Those run in plain Node, so they're fast to test and run in CI. The
files that touch macOS stay thin and are covered by the Playwright tests.

---

## 10. Building, running and testing

All commands run in `desktop/`. Node 24 or newer (the icons script runs TypeScript
directly).

| Command | What it does |
|---|---|
| `npm install` | Dev dependencies. Electron downloads its binary the first time it runs. |
| `npm start` | Build and open the app from source, on the live site. |
| `TRELLIS_URL=http://localhost:3000 npm start` | The same, on the local frontend (see CLAUDE.md "Run"). |
| `npm run typecheck` | `tsc` with no output. |
| `npm test` | Unit tests (26): the pure files. In CI too. |
| `npm run test:e2e` | Playwright (8): launches the real app against a tiny fake site; checks the lockdown, permissions, offline page, menu, shortcut, update check and the first page (Log in, or the map with a session). |
| `npm run test:e2e:stack` | Playwright (3): the real app against the **local stack** (dev Postgres, backend on :8000, frontend on :3000 must be running): the whole Google sign-in except Google itself, an unasked-for link ignored, `trellis://open/map`. |
| `npm run dist` | Icons, build, and `release/Trellis-<version>-arm64.dmg`, ad-hoc signed with the Fuses set. |

**Development-only switches** (each is ignored in the packaged app, so nobody can use
them to change a student's copy):

| Variable | Effect |
|---|---|
| `TRELLIS_URL` | Point the window at another site, e.g. the local frontend. |
| `TRELLIS_USER_DATA` | Use another data folder (each e2e test gets a fresh one). |
| `TRELLIS_UPDATES=off` | No background update check (tests never depend on GitHub). |

From source, the app never registers `trellis://` with macOS (it would register the
generic Electron binary); tests deliver links by emitting `open-url`.

**Checking a build** (all done on 21 Nov 2026 for 1.0.0):

```bash
codesign -dv --verbose=2 release/mac-arm64/Trellis.app   # Signature=adhoc, flags (adhoc,runtime)
codesign --verify --deep --strict release/mac-arm64/Trellis.app
codesign -d --entitlements - --xml release/mac-arm64/Trellis.app | plutil -p -
npx @electron/fuses read --app release/mac-arm64/Trellis.app
open "trellis://open/map"                                 # reaches the running copy
spctl --assess --type execute release/mac-arm64/Trellis.app   # "rejected": not notarized (§6)
```

`fuses read` prints one line as "undefined is Enabled": a fuse newer than the reading
tool's list of names. It isn't one of ours.

**Releasing a version:**

1. Raise `version` in `desktop/package.json` (the update check compares it).
2. `npm run dist`.
3. Publish it (the tag must be `v<version>`; the app strips the `v` and compares):
   ```bash
   gh release create v<version> release/Trellis-<version>-arm64.dmg \
     --repo niteshkumar7557/trellis-desktop --title "Trellis <version>" --notes "…"
   ```
   Or on github.com: the repo → **Releases** (right-hand sidebar) → **Draft a new
   release**. A brand-new empty repo shows no Releases section at all: a release points at
   a tag and a tag needs a commit, so the repo got a README first. Running copies see the
   new version within a day, or at once from "Check for Updates…".

**CI:** the `desktop` job in `.github/workflows/ci.yml` runs `npm run typecheck` and
`npm test` on every push. The Playwright tests need a display and the `.dmg` needs
macOS; macOS runners use up a private repo's free minutes ten times faster, so both run
on the owner's laptop.

---

## 11. Decisions

| Date | Decision | Why |
|---|---|---|
| 21 Nov 2026 | Load the live site; don't bundle the frontend | One frontend, always current; the API needs the network anyway |
| 21 Nov 2026 | electron-builder; TypeScript with `tsc` | One config makes a signed `.dmg`; no hidden bundler |
| 21 Nov 2026 | Ad-hoc signing, no notarization | $0; the cost is the one-time "Open Anyway" |
| 21 Nov 2026 | Two entitlements: `allow-jit`, `disable-library-validation` | The hardened runtime stays on; V8 needs the first, an ad-hoc app loading Electron's frameworks the second. `allow-jit` was found missing when the first packaged build crashed at launch ("Failed to reserve virtual memory for CodeRange") |
| 21 Nov 2026 | Fuses set by electron-builder's `electronFuses`, before signing | The signature then covers them; no extra script |
| 21 Nov 2026 | Every permission refused except `clipboard-sanitized-write` from the site | "Copy prompt" uses the clipboard; found while building, pinned by an e2e test |
| 21 Nov 2026 | Google in the system browser, a one-time code by deep link, PKCE | Google blocks embedded sign-in; RFC 8252 |
| 21 Nov 2026 | The hand-off code reuses the backend's `newRandomToken()` (64 hex) | One random-secret function to audit, not two |
| 21 Nov 2026 | `.dmg` in a public GitHub release repo (owner) | Free; private code stays private |
| 21 Nov 2026 | Update check, not auto-update | Squirrel.Mac needs Developer ID signing |
| 21 Nov 2026 | Daily reminder + update notifications; ⌃⌥T (owner) | Real desktop features with no server change. **The reminder was reversed the same day (1.0.1)**, see below |
| 21 Nov 2026 | Go menu: Map, Check-ins, Settings | Mirrors the site's sidebar; Start is a one-time page |
| 21 Nov 2026 | Closing the window hides it; ⌘Q quits | The Mac convention; ⌃⌥T keeps working and reopening is instant |
| 21 Nov 2026 | The `.dmg` has a plain background colour | electron-builder's default background is a bitmap; Trellis ships none |
| 21 Nov 2026 | **No daily reminder** (removed in 1.0.1, owner) | It broke two written promises: `design.md` §14 puts "Reminders, notifications" outside v1, and the landing page says "No streaks, no reminders". It was proposed without checking the design. The update notification stays: it answers a check, it doesn't ask the student to study |
| 21 Nov 2026 | The app opens Log in when signed out (1.0.1) | The app has no landing page; 1.0.0 opened the sample student with no way to log in |
| 21 Nov 2026 | Download links in the landing footer and in Settings, hidden inside the app | Signed-in students never see the landing page; the links point at the latest release page, which never changes |

---

## 12. Progress

| Step | State |
|---|---|
| 1. The secure window | done |
| 2. Menu, tray, shortcut | done (icons script too) |
| 3. Notifications, update check | done |
| 4. Deep links | done (with the app's half of Google sign-in) |
| 5. Backend hand-off + `/auth/desktop` + tests | done; **needs a production release** before Google sign-in works in the app |
| 6. Icons, packaging, `.dmg` | done: `Trellis-1.0.0-arm64.dmg` built and checked locally |
| 7. Docs in step | done |
| Shipped (21 Nov 2026) | merged into `main` with a merge commit and released (the backend hand-off is live); the public repo https://github.com/niteshkumar7557/trellis-desktop has release **v1.0.0** with the `.dmg` |
| 1.0.1 (21 Nov 2026) | see §13 |

**Known limits** (honest, for the viva):

- Without notarization, every student meets Gatekeeper's "Open Anyway" once.
- Updates are manual: download and replace.
- The global shortcut presses ⌘K, and the site's ⌘K toggles: pressing ⌃⌥T while search is
  already open closes it.
- Signing in with Google needs the browser's "Open Trellis?" prompt allowed once.
- The update check uses GitHub's unauthenticated API: 60 calls an hour **per public IP
  address**. On a network that shares one address among many people (college Wi-Fi, an
  ISP's carrier-grade NAT), the allowance can be used up by others. Seen on 21 Nov 2026
  (HTTP 403 "rate limit exceeded"). The app then stays quiet (background) or says
  "Couldn't check for updates" (menu); it never breaks. The fix, if it matters: a small
  `latest.json` served by the site (CloudFront), checked first.

---

## 13. Changes since 1.0.0

**1.0.1 (21 Nov 2026), with a site release the same day.** The owner opened 1.0.0 and found
the sample student with no way to log in or out:

- **The cause:** 1.0.0 opened `/map`. Signed out, the site shows the sample student there,
  and its bar offered only "Start your own map". A browser visitor finds Log in on the
  landing page; the app never shows it. (This doc's first version claimed the demo had a
  "Sign in"; it didn't, and nobody checked.) Log out was there all along, in Settings →
  Account, but only when signed in.
- **App:** opens `/login` when the window's cookie store has no `refresh_token`, else
  `/map` (`start-path.ts`, `firstPath()` in `window.ts`; unit and e2e tested).
- **Site:** the sample-student bar has **Log in** next to "Start your own map", in the
  browser and in the app (`components/app/Shell.tsx`).
- **Site:** a download link: "Mac app (Apple Silicon)" in the landing footer and a "Mac app"
  panel in Settings, both to the latest release page and hidden inside the app
  (`frontend/lib/desktop.ts`: `MAC_APP_URL`, `useIsDesktopApp()`, which reads
  `window.trellisDesktop` from the preload).
- **App:** the daily study reminder is gone (§11, "No daily reminder"). The settings file
  keeps only the window's position; a 1.0.0 file's reminder field is ignored.
