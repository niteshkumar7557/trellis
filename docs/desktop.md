# The Trellis desktop app (macOS)

A Mac app for Trellis, built with **Electron**. It opens the live site
(https://trellis.niteshkumar.xyz) in a locked-down window and adds what a browser tab
can't: a menu, a menu-bar icon, notifications, a shortcut that works from any app, Google
sign-in through the system browser, and an update check.

It's a graded university elective (21 Nov 2026). The owner must explain every decision in
a viva, so every choice below names the alternatives and the trade-off.

Status: **design approved by the owner, 21 Nov 2026; being built on `feature/desktop`.** This doc is
updated as each part lands; the "Progress" table at the end says what exists.

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
| **Permissions**: every request (camera, microphone, location, …) is refused | The site, or anything injected into it, using the Mac's hardware. Trellis needs none. |
| **IPC checks**: main answers a message only if it came from the main window's frame and the frame's URL is on the allow-list | A stray frame calling the bridge. |
| A small preload API: about five functions, each taking plain values | The page reaching anything else. |
| **Electron Fuses** (set when packaging): no `RunAsNode`, no `NODE_OPTIONS`, no `--inspect`, cookies encrypted, app code only from the signed `asar` with integrity checking | Someone using the installed app as a general Node.js runner, or swapping its code. |
| **Single instance** (`requestSingleInstanceLock`) | Two copies running; also needed so a deep link reaches the copy that's open. |

**Where it falls short of production:** without notarization Apple hasn't scanned the app,
and the ad-hoc signature only proves the app hasn't changed since it was built, not who
built it (§6).

**Small things the window also does:** it remembers its size and position (a JSON file in
the app's data folder); it starts at `/map` (a signed-in student sees their map; a
signed-out one sees the demo with "Sign in"); it shows a bundled offline page when the site
can't be reached.

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
proves the bundle hasn't changed since it was signed, not who made it. Electron's own
frameworks carry Apple's team signature, so the app also needs the
`com.apple.security.cs.disable-library-validation` entitlement, or macOS refuses to load
them into an ad-hoc-signed app. This keeps the hardened runtime on (the alternative,
turning hardened runtime off, weakens more).

**What a student sees:** a downloaded, un-notarized app is blocked the first time
("Apple could not verify…"). The fix is **System Settings → Privacy & Security → Open
Anyway**, once. The release notes and this doc say so. Removing that step costs the
$99-a-year Developer Program; that's the production answer.

---

## 7. Desktop features

| Feature | What it does | Electron API |
|---|---|---|
| **Menu** | The standard Mac menus (Trellis, Edit, View, Window, Help) plus **Go**: Map ⌘1, Check-ins ⌘2, Settings ⌘3 (the site's sidebar; changed from "Start" while building, 21 Nov 2026: Start is the one-time setup page). View: Search…, reload, zoom. Trellis menu: **Check for Updates…** | `Menu`, `MenuItem` roles |
| **Tray** (menu-bar icon) | Show Trellis, Search, Daily reminder on/off and time, Check for Updates, Quit | `Tray`, a template image |
| **Notifications** | A **daily study reminder** at a time the student picks ("Time to study. Your map is waiting."); and **"Trellis X is available"**. Clicking one opens the app on `/map` (or the download). Scheduled in main; no server. | `Notification` |
| **Global shortcut** | **⌃⌥T** from any app: bring Trellis to the front and open search (the site's ⌘K). Not ⌘⇧T, which every browser uses for "reopen tab". | `globalShortcut`, `webContents.sendInputEvent` |
| **Deep links** | `trellis://auth?code=…` (sign-in, §5) and `trellis://open/map`. Anything else is ignored. | `open-url`, `CFBundleURLTypes` |
| **Update check** | At start, once a day and from the menu: ask GitHub for the release repo's latest release, compare its version with `app.getVersion()`, and if newer, notify and offer to open the download page. | `net.fetch`, `shell.openExternal` |

**Update check details (my call, within the owner's choice):** the app reads the release
repo's "latest release" from GitHub's public API instead of a `latest.json` on the site.
Publishing a GitHub release is then the whole release; no site release needed. GitHub
allows 60 unauthenticated calls an hour per address, far more than a daily check needs.
The release repo must be **public**; the owner creates it (an outward-facing step, so it
waits for the owner's say-so).

**Settings the app keeps** (reminder on/off, its time, window bounds): a small JSON file
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
  package.json            electron, electron-builder, typescript (dev); the build config
  tsconfig.json
  entitlements.mac.plist  disable-library-validation (§6)
  src/
    main/                 the main process: one file per job
      index.ts            start-up: single instance, deep-link listener, ready
      window.ts           the secure window (§4)
      security.ts         the allow-list and checks (pure, unit-tested)
      menu.ts  tray.ts  shortcut.ts  notifications.ts  updates.ts  deeplink.ts  auth.ts
      settings.ts         the JSON settings file
    preload/index.ts      the bridge (§2)
    offline.html          the "can't reach Trellis" page
  scripts/icons.mjs       SVG → PNG and .icns (§8)
  test/                   unit tests (vitest); one Playwright launch test
```

---

## 10. Building, running and testing

(Filled in as the parts land.)

- **Tests:** unit tests for the pure logic (the URL allow-list, deep-link parsing, version
  comparison, PKCE); backend unit and integration tests for the hand-off; one Playwright
  test that launches the app and checks the window is locked down.
- **CI:** a desktop job runs the typecheck and the unit tests. The `.dmg` is built on the
  owner's laptop: macOS runners use up a private repo's free minutes ten times faster.

---

## 11. Decisions

| Date | Decision | Why |
|---|---|---|
| 21 Nov 2026 | Load the live site; don't bundle the frontend | One frontend, always current; the API needs the network anyway |
| 21 Nov 2026 | electron-builder; TypeScript with `tsc` | One config makes a signed `.dmg`; no hidden bundler |
| 21 Nov 2026 | Ad-hoc signing, no notarization | $0; the cost is the one-time "Open Anyway" |
| 21 Nov 2026 | Google in the system browser, a one-time code by deep link, PKCE | Google blocks embedded sign-in; RFC 8252 |
| 21 Nov 2026 | `.dmg` in a public GitHub release repo (owner) | Free; private code stays private |
| 21 Nov 2026 | Update check, not auto-update | Squirrel.Mac needs Developer ID signing |
| 21 Nov 2026 | Daily reminder + update notifications; ⌃⌥T (owner) | Real desktop features with no server change |

---

## 12. Progress

| Step | State |
|---|---|
| 1. The secure window | done |
| 2. Menu, tray, shortcut | done (icons script too) |
| 3. Notifications, update check | done |
| 4. Deep links | done (with the app's half of Google sign-in) |
| 5. Backend hand-off + `/auth/desktop` + tests | done (not released yet) |
| 6. Icons, packaging, `.dmg` | not started |
| 7. Docs in step (README, docs/README.md, tech-stack.md, CLAUDE.md) | not started |
