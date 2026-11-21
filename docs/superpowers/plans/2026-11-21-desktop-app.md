# Trellis desktop app (Electron, macOS) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A macOS (arm64) Electron app that opens https://trellis.niteshkumar.xyz in a locked-down window, with a menu, a tray, notifications, a global shortcut, Google sign-in through the system browser with a `trellis://` deep link, and an update check, packaged as an ad-hoc-signed `.dmg`.

**Architecture:** `desktop/` is its own npm package. The main process (`src/main/`, one file per job) owns the window and every OS feature. A sandboxed preload exposes a tiny bridge. Pure logic (allow-list, deep-link parsing, PKCE, version comparison, reminder timing, menu template) sits in files with no `electron` import, so vitest can test it. The backend gets a one-time-code hand-off for Google (migration 0020, two route changes, one new route) and the frontend gets `/auth/desktop`.

**Tech Stack:** Electron 45, electron-builder 26, @electron/fuses 2, TypeScript (`tsc`), vitest, Playwright `_electron`, @resvg/resvg-js (icons), macOS `iconutil`.

**Spec:** `docs/desktop.md`

## Global Constraints

- macOS arm64 only; `mac.identity: "-"` (ad-hoc); entitlement `com.apple.security.cs.disable-library-validation`; hardened runtime on; no notarization.
- Production origin `https://trellis.niteshkumar.xyz`. `TRELLIS_URL` may override it **only when `!app.isPackaged`** (local dev against `http://localhost:3000`).
- Window: `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`; all permission requests refused; start path `/map`.
- Deep-link scheme `trellis`; accepted: `trellis://auth?code=<43 base64url chars>` and `trellis://open/map`. Everything else ignored.
- Global shortcut `Control+Alt+T` (⌃⌥T); Go menu: Map ⌘1 (`/map`), Check-ins ⌘2 (`/check-ins`), Settings ⌘3 (`/settings`).
- Reminder copy: title "Time to study", body "Your map is waiting." Update copy: title "Trellis <version> is available", body "Click to download it."
- Update source: `https://api.github.com/repos/niteshkumar7557/trellis-desktop/releases/latest` (public release repo; the owner creates it).
- Hand-off code: 32 random bytes base64url (43 chars), stored as SHA-256 hex, 2-minute expiry, single use. Challenge = base64url(SHA-256(verifier)), 43 chars.
- No raster source files: icons are generated from `MARK_PATH` in `frontend/components/brand/brand.ts`.
- Comments explain why, for a student maintainer. No Claude co-author line on commits.

## Review Focus

1. **A deep link arrives before the window exists** (the app was closed and the link launched it): it must be queued and handled after ready, not lost. Test: `deeplink.test.ts` "queues a link received before ready".
2. **The hand-off code is replayed or raced** (two exchanges with the same code): exactly one succeeds. Test: integration "a code works once, even twice at once".
3. **A redirect leaves the allowed origin** (e.g. `/api/auth/google` 302s to accounts.google.com inside the window): blocked, sent to the browser. Test: `security.test.ts` covers `isAllowedUrl` for lookalike hosts (`trellis.niteshkumar.xyz.evil.test`, `http:` downgrade, userinfo `https://x@evil.test`).
4. **The site is unreachable at start** (offline, DNS): the offline page shows, and Retry reloads the site. Test: e2e loads with `TRELLIS_URL=http://127.0.0.1:9` and expects the offline page.
5. **Clock and timezone edges in the reminder** (time already passed today; DST): next fire is tomorrow at that local time. Test: `reminder.test.ts` "already passed today → tomorrow".

---

### Task 1: The secure window

**Files:**
- Create: `desktop/package.json`, `desktop/tsconfig.json`, `desktop/vitest.config.ts`, `desktop/.gitignore`
- Create: `desktop/src/main/config.ts`, `security.ts`, `settings.ts`, `window.ts`, `index.ts`
- Create: `desktop/src/preload/index.ts`, `desktop/src/offline.html`
- Test: `desktop/test/security.test.ts`, `desktop/test/settings.test.ts`, `desktop/test/e2e/window.e2e.ts`, `desktop/playwright.config.ts`

**Interfaces:**
- Produces: `siteOrigin(): string` (config.ts); `isAllowedUrl(url: string, origin: string): boolean`, `isExternalSafe(url: string): boolean` (security.ts, pure); `loadSettings(dir: string): Settings`, `saveSettings(dir: string, s: Settings): void`, `type Settings = { bounds?: {x,y,width,height}; reminder: { on: boolean; time: string /* "HH:MM" */ } }` default `{ reminder: { on: false, time: "19:00" } }`; `createMainWindow(): BrowserWindow`, `getMainWindow(): BrowserWindow | null`, `showPath(path: string): void` (window.ts).

- [ ] **Step 1: Scaffold** `desktop/` with scripts `build` (`tsc -p .` + copy `offline.html` to `dist/`), `start` (`npm run build && electron .`), `typecheck`, `test` (`vitest run`), `test:e2e` (`npm run build && playwright test`). `main` = `dist/main/index.js`. CommonJS output (`module: "commonjs"`): Electron's sandboxed preload can't be an ES module. Install electron, typescript, vitest, @playwright/test, @types/node as dev deps.
- [ ] **Step 2: Write failing tests** `security.test.ts`: `isAllowedUrl("https://trellis.niteshkumar.xyz/map", O)` true; false for `http://trellis.niteshkumar.xyz/`, `https://trellis.niteshkumar.xyz.evil.test/`, `https://x@evil.test/`, `https://accounts.google.com/`, `not a url`. `isExternalSafe` true for `https:`/`http:`, false for `file:///etc/passwd`, `javascript:alert(1)`, `trellis://auth`. `settings.test.ts`: missing file → defaults; round-trip; corrupt JSON → defaults (never throws).
- [ ] **Step 3: Run** `cd desktop && npm test` → FAIL (modules missing).
- [ ] **Step 4: Implement** security.ts and settings.ts (compare `new URL(u).origin === origin`; settings writes atomically via temp file + rename).
- [ ] **Step 5: Run** `npm test` → PASS.
- [ ] **Step 6: Implement** window.ts (webPreferences per Global Constraints; `will-navigate`/`will-redirect` block + `shell.openExternal` if `isExternalSafe`; `setWindowOpenHandler` → deny; `did-fail-load` on main frame → `loadFile(offline.html)`; save bounds on `close`), preload (`contextBridge.exposeInMainWorld("trellisDesktop", { isDesktop: true, retry: () => ipcRenderer.send("retry") })`), index.ts (single-instance lock, `session.defaultSession.setPermissionRequestHandler((_, __, cb) => cb(false))` and `setPermissionCheckHandler(() => false)`, `ipcMain.on("retry")` checks `event.senderFrame` belongs to the main window). Offline page: plain HTML, the site's light/dark colours via `prefers-color-scheme`, a Retry button calling `trellisDesktop.retry()`.
- [ ] **Step 7: Write e2e** `window.e2e.ts` (launch `dist/main/index.js` with `TRELLIS_URL=http://127.0.0.1:<static server>`): web preferences report `contextIsolation`, `sandbox` true; `typeof require` in page is `"undefined"`; `window.trellisDesktop.isDesktop` is true; `location.href = "https://example.com"` leaves the URL unchanged; with `TRELLIS_URL=http://127.0.0.1:9` the offline page title is "Can't reach Trellis".
- [ ] **Step 8: Run** `npm run test:e2e` → PASS. Run `npm run typecheck` → clean.
- [ ] **Step 9: Commit** `feat(desktop): a secure window on the live site`.

### Task 2: Menu, tray, global shortcut, icons

**Files:**
- Create: `desktop/scripts/icons.ts`, `desktop/src/main/menu-template.ts` (pure), `menu.ts`, `tray.ts`, `shortcut.ts`
- Modify: `desktop/src/main/index.ts`, `desktop/package.json` (`icons` script; `build` runs it)
- Test: `desktop/test/menu-template.test.ts`

**Interfaces:**
- Consumes: `showPath`, `getMainWindow` (Task 1).
- Produces: `goItems(): { label: string; path: string; accelerator: string }[]` (menu-template.ts); `buildMenu(actions: MenuActions)`, `type MenuActions = { go(path: string): void; checkForUpdates(): void; openSearch(): void }`; `createTray(actions: TrayActions)`; `registerShortcut(onPress: () => void): boolean`; `openSearch(): void` (window.ts addition: show + focus + `sendInputEvent` ⌘K keyDown/keyUp).

- [ ] **Step 1: Failing test** `goItems()` deep-equals the three Go items in Global Constraints.
- [ ] **Step 2: Run** → FAIL. **Step 3:** implement. **Step 4:** run → PASS.
- [ ] **Step 5: Icons script** `node scripts/icons.ts` (Node runs TS natively) imports `MARK_PATH` from `../../frontend/components/brand/brand.ts`, renders with resvg: `build/icon.iconset/*` (16–1024 px, leaf tile like `app/icon.svg`) → `iconutil -c icns` → `build/icon.icns`; `assets/trayTemplate.png` (16 px) and `assets/trayTemplate@2x.png` (32 px), black strokes on transparent. Output is git-ignored.
- [ ] **Step 6: Wire** menu (roles appMenu/editMenu/viewMenu/windowMenu + Go + "Check for Updates…" in the app menu), tray (Show Trellis, Search, Daily reminder submenu placeholder until Task 3, Check for Updates, Quit), shortcut (`app.on("will-quit", globalShortcut.unregisterAll)`; on failure log, don't crash).
- [ ] **Step 7: Manual check** `npm start`: ⌘1/2/3 navigate; tray shows; ⌃⌥T from another app focuses Trellis with search open.
- [ ] **Step 8: Commit** `feat(desktop): menu, menu-bar icon and the ⌃⌥T shortcut`.

### Task 3: Notifications and the update check

**Files:**
- Create: `desktop/src/main/reminder-time.ts` (pure), `reminder.ts`, `version.ts` (pure), `updates.ts`
- Modify: `menu.ts`, `tray.ts`, `index.ts`
- Test: `desktop/test/reminder.test.ts`, `desktop/test/version.test.ts`

**Interfaces:**
- Produces: `msUntilNext(time: string, now: Date): number`; `isNewer(latest: string, current: string): boolean`; `parseLatestRelease(json: unknown): { version: string; url: string } | null`; `startReminder(getSettings)`, `checkForUpdates({ quiet: boolean }): Promise<void>`.

- [ ] **Step 1: Failing tests:** `msUntilNext("19:00", 18:00 local)` = 3,600,000; `"19:00"` at 19:30 → 23.5 h; at exactly 19:00 → 24 h. `isNewer("1.2.0","1.1.9")` true, `("1.0.0","1.0.0")` false, `("v1.10.0","1.9.0")` true (leading v), garbage → false. `parseLatestRelease({tag_name:"v1.1.0", html_url:"https://github.com/…"})` → `{version:"1.1.0", url}`; missing fields or non-`https://github.com/` url → null.
- [ ] **Step 2: Run** → FAIL. **Step 3:** implement. **Step 4:** run → PASS.
- [ ] **Step 5: Wire:** reminder uses `setTimeout(msUntilNext)` re-armed after each fire and on settings change; notification click → `showPath("/map")`. Tray reminder submenu: On/off checkbox and times 08:00 / 13:00 / 19:00 / 21:00 as radio items. Updates: on ready (quiet), every 24 h (quiet), menu (loud: a dialog for "You're up to date" and for errors). Newer → notification; click → `shell.openExternal(url)`. 5-second timeout via `AbortSignal.timeout`.
- [ ] **Step 6: Manual check:** set reminder to a minute ahead (temporary dev-only env `TRELLIS_REMINDER_TEST=1` that fires after 10 s, ignored when packaged).
- [ ] **Step 7: Commit** `feat(desktop): a daily study reminder and an update check`.

### Task 4: Backend hand-off for desktop Google sign-in

**Files:**
- Create: `backend/src/db/migrations/0020_desktop_handoffs.sql`, `backend/src/repos/desktop-handoffs.repo.ts`
- Modify: `backend/src/controllers/auth.controller.ts`, `backend/src/routes/auth.routes.ts`, `backend/src/utils/tokens.ts` (add `pkceChallenge(verifier)` if not there)
- Create: `frontend/app/auth/desktop/page.tsx` (+ module CSS if needed)
- Test: `backend/test/google.routes.test.ts` (extend), `backend/test/integration/desktop-handoff.test.ts`

**Interfaces:**
- Produces: `createHandoff(userId: number, codeHash: string, challenge: string): Promise<void>`; `useHandoff(codeHash: string, challenge: string): Promise<number | null>` (one `UPDATE … SET used_at = now() WHERE code_hash=$1 AND challenge=$2 AND used_at IS NULL AND expires_at > now() RETURNING user_id`). Routes: `GET /api/auth/google?desktop=<challenge>`; `POST /api/auth/desktop/exchange {code, verifier}` → 200 `{accessToken, student}` + refresh cookie, or 400 `handoff_invalid`.

- [ ] **Step 1: Failing unit tests** (google.routes.test.ts): `?desktop=` with a 43-char base64url value sets a `google_desktop` cookie (HttpOnly, Lax, Path=/api/auth/google); a bad value → 400 `validation`; callback with both cookies → 302 to `/auth/desktop?code=<43 chars>`, `saveRefreshToken` not called, no refresh cookie set; callback without the desktop cookie → unchanged (`/auth/done`).
- [ ] **Step 2: Failing integration tests** (desktop-handoff.test.ts, real Postgres): exchange with the right verifier → 200 and a refresh cookie; same code again → 400; wrong verifier → 400 and the code still works with the right one afterwards; expired (set `expires_at` in the past) → 400; two concurrent exchanges → one 200, one 400.
- [ ] **Step 3: Run** `cd backend && npm test` and `npm run test:integration` → the new ones FAIL.
- [ ] **Step 4: Implement** migration, repo, controller (zod body `{code: string 43, verifier: string 43..128}`; `loginLimiter` on the exchange; callback branches on the desktop cookie and clears it), route.
- [ ] **Step 5: Run** both suites → PASS; `npm run typecheck` clean.
- [ ] **Step 6: Frontend page** `/auth/desktop`: reads `code` from the query, sets `location.href = "trellis://auth?code=" + code` once, shows "Opening Trellis…", an "Open Trellis" link to the same URL, and "You can close this tab." Uses the existing `(auth)` styles and tokens. Checks: `npx tsc --noEmit`, `npx eslint .`, `npm run lint:shared`.
- [ ] **Step 7: Docs:** `backend-design.md` §3 (table) and §4 (routes, the hand-off); `codebase.md` §9 row.
- [ ] **Step 8: Commit** `feat(auth): a one-time code hands Google sign-in to the desktop app`.

### Task 5: Deep links and Google sign-in in the app

**Files:**
- Create: `desktop/src/main/deeplink.ts` (pure parse + queue), `pkce.ts` (pure), `auth.ts`
- Modify: `index.ts`, `window.ts` (`will-navigate` hook for `/api/auth/google`)
- Test: `desktop/test/deeplink.test.ts`, `desktop/test/pkce.test.ts`

**Interfaces:**
- Consumes: Task 4's routes; `showPath`, `getMainWindow`.
- Produces: `parseDeepLink(url: string): { kind: "auth"; code: string } | { kind: "open"; path: "/map" } | null`; `createLinkQueue(handle: (link) => void): { push(url: string): void; ready(): void }`; `makeVerifier(): string`, `challengeOf(verifier: string): string`; `startGoogleSignIn(): void`, `finishGoogleSignIn(code: string): Promise<void>`.

- [ ] **Step 1: Failing tests:** RFC 7636 Appendix B vector: `challengeOf("dBjftJeZ4CVP-mJ92K9qTmNHUpTelSrlwMFJ6ywpbXk") === "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"`; `makeVerifier()` is 43 base64url chars and differs each call. `parseDeepLink`: valid auth → `{kind:"auth", code}`; code of wrong length or with `/` → null; `trellis://open/map` → open; `trellis://open/settings`, `https://…`, `trellis://evil` → null. Queue: pushes before `ready()` are handled after it, in order; pushes after are handled at once.
- [ ] **Step 2: Run** → FAIL. **Step 3:** implement. **Step 4:** run → PASS.
- [ ] **Step 5: Wire:** `app.on("open-url")` registered **before** `whenReady` (Electron's rule), feeding the queue; `app.setAsDefaultProtocolClient("trellis")`. Window's `will-navigate` to `<origin>/api/auth/google` → `preventDefault` + `startGoogleSignIn()` (keeps the verifier in memory, at most one pending, opens `<origin>/api/auth/google?desktop=<challenge>` with `shell.openExternal`). `finishGoogleSignIn` posts with `session.defaultSession.fetch(…, { method: "POST", credentials: "include", headers: {"content-type":"application/json"} })`; on 200 confirm the refresh cookie exists with `session.defaultSession.cookies.get({ url: origin })` and load `/auth/done`; else load `/login?error=google`. If `fetch` doesn't store the cookie, fall back to `cookies.set` from the response is NOT possible (HttpOnly is fine to set, but the token isn't in the body): stop and report instead.
- [ ] **Step 6: Manual end-to-end** against local dev (frontend :3000, backend :8000, Google configured in dev): packaged build needed for `trellis://` registration on macOS, so do this after Task 6, and record the result in `docs/desktop.md`.
- [ ] **Step 7: Commit** `feat(desktop): trellis:// deep links and Google sign-in through the system browser`.

### Task 6: Packaging, CI and docs

**Files:**
- Create: `desktop/entitlements.mac.plist`, `desktop/electron-builder.yml`, `desktop/scripts/after-pack.cjs` (fuses)
- Modify: `.github/workflows/ci.yml` (a `desktop` job), `docs/desktop.md` (§10, §12), `README.md`, `docs/README.md`, `docs/tech-stack.md`, `CLAUDE.md`
- Test: e2e from Task 1 still passes; `codesign`/`spctl` checks below

- [ ] **Step 1: Config:** appId `xyz.niteshkumar.trellis`, productName `Trellis`, `mac.target: dmg` arch `arm64`, `identity: "-"`, `hardenedRuntime: true`, `entitlements` + `entitlementsInherit` the plist, `protocols: [{ name: "Trellis", schemes: ["trellis"] }]`, `files: dist/**, assets/**`, `asar: true`, `afterPack` flips fuses: `RunAsNode` off, `EnableNodeOptionsEnvironmentVariable` off, `EnableNodeCliInspectArguments` off, `EnableCookieEncryption` on, `EnableEmbeddedAsarIntegrityValidation` on, `OnlyLoadAppFromAsar` on (`resetAdHocDarwinSignature: true`).
- [ ] **Step 2: Build** `npm run dist` → `desktop/release/Trellis-<v>-arm64.dmg`.
- [ ] **Step 3: Verify:** `codesign -dv --verbose=2 release/mac-arm64/Trellis.app` shows `Signature=adhoc`; `codesign --verify --deep --strict` passes; `npx @electron/fuses read --app release/mac-arm64/Trellis.app` shows the fuses; app launches from the mounted dmg; `open "trellis://open/map"` focuses it.
- [ ] **Step 4: Manual Google sign-in end to end** (Task 5 Step 6).
- [ ] **Step 5: CI job** `desktop`: ubuntu-24.04, `npm ci`, `npm run typecheck`, `npm test` in `desktop/` (no e2e: needs a display; no dmg: macOS minutes).
- [ ] **Step 6: Docs** in step; progress table.
- [ ] **Step 7: Commit** `build(desktop): an ad-hoc-signed arm64 .dmg; CI runs the desktop checks`.
