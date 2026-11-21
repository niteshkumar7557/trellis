# Trellis Android App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A native Android app (`.apk`) for Trellis in React Native + Expo that reuses `shared/` and talks to the live API, plus the backend's mobile sign-in mode.

**Architecture:** `mobile/` is an Expo Router app; Metro reads `../shared` through the `@shared/*` alias. A small API client keeps the access token in memory and the refresh token in `expo-secure-store`; the backend returns the refresh token in the body when the request carries `X-Trellis-Client: mobile`. Google sign-in reuses the desktop hand-off (PKCE + one-time code + `trellis://`).

**Tech Stack:** Expo SDK 58, React Native 0.88, Expo Router, react-native-svg, Reanimated, gesture-handler, expo-secure-store, expo-web-browser, expo-crypto, expo-haptics, expo-clipboard, expo-sharing, expo-file-system, jest-expo + React Native Testing Library; backend Express 5 + vitest + supertest.

**Spec:** `docs/mobile.md`

## Global Constraints

- `shared/` is used as is: no edits for the app's sake.
- $0: no EAS Build, no Play Console, no paid service; the APK is built locally.
- Signed-in only; no demo, no reminders, no notifications (`design.md` §14).
- Colours only from `mobile/src/theme/tokens.ts`, which equals `frontend/app/globals.css` hex for hex (a test enforces it).
- IBM Plex Sans only; pictures are SVG drawn in code; launcher PNGs generated from the SVG mark and git-ignored.
- Touch targets at least 44px.
- Package id `xyz.niteshkumar.trellis`; URL scheme `trellis`; API `https://trellis.niteshkumar.xyz/api`.
- Comments explain why (owner's rule); no Claude co-author line in commits; commit only on `feature/mobile`.

## Review Focus

1. Refresh token stored but revoked server-side (logged out elsewhere, account deleted): app start must land on Log in and delete the stored token, not loop.
2. Two requests meet an expired access token at once: one refresh, both retried (pinned in Task 3's api test).
3. No network at start: a "Can't reach Trellis" state with Retry, not Log in (a network failure must never delete the stored token).
4. Mobile mode without a body token (`POST /refresh` with the header, empty body) answers 401, never 500 (pinned in Task 1).
5. A `trellis://auth` link arriving with no sign-in in progress (no verifier in memory) is ignored.

---

### Task 1: Backend mobile mode

**Files:**
- Modify: `backend/src/controllers/auth.controller.ts`
- Test: `backend/test/auth.routes.test.ts` (new `describe("mobile mode")`), `backend/test/integration/auth.test.ts` (one mobile cycle)
- Docs: `docs/backend-design.md` §4 (auth routes), `docs/codebase.md` §9

**Interfaces:**
- Produces: header `X-Trellis-Client: mobile`; `register`/`login`/`desktop/exchange` → `{accessToken, refreshToken, student}` and no `Set-Cookie`; `refresh` body `{refreshToken}` → `{accessToken, refreshToken}`; `logout` body `{refreshToken}` → 204.

- [ ] Step 1: tests (unit): with the header, login answers `refreshToken` (64 hex) and sets no `refresh_token` cookie; `saveRefreshToken` got its hash. Refresh with `{refreshToken}` calls `useRefreshToken(hashToken(token))` and answers both tokens; with empty body → 401 `unauthorized`; with a refused token → 401 and no Set-Cookie. Logout with body token calls `deleteRefreshToken(hash)`. Without the header everything behaves as before (existing tests stay green).
- [ ] Step 2: run `npm test -- auth.routes` → new tests fail.
- [ ] Step 3: implement `isMobile(req): boolean` and make `startSession(req, res, userId)` return `{accessToken, refreshToken?}`; `refresh`/`logout` read the token from `req.body.refreshToken` in mobile mode (string check, no schema change for browser calls).
- [ ] Step 4: integration: register with the header → refresh with body → logout with body → refresh refused. Run `npm test`, `npm run typecheck`, `npm run test:integration` (dev Postgres up).
- [ ] Step 5: docs; commit `feat(auth): a mobile mode that returns the refresh token in the body`.

### Task 2: `mobile/` scaffold, theme and `shared/` on the phone

**Files:** `mobile/package.json`, `app.config.ts`, `metro.config.js`, `tsconfig.json`, `jest.config.js`, `.gitignore`, `app/_layout.tsx`, `src/theme/tokens.ts`, `src/theme/theme.tsx`, `src/theme/type.ts`, `src/ui/*` (Text, Button, Pill, StatusMark, Difficulty, Segmented, Card, Icon, Mark, Skeleton), `test/tokens.test.ts`, `test/shared.test.ts`, `test/ui.test.tsx`.

**Interfaces:**
- Produces: `tokens.light/dark: Record<TokenName, string>`; `useTheme(): {c: Tokens, scheme, pref, setPref}`; `<T variant="title|section|body|small|figure" tone="text|muted|faint">`; `<Button kind="primary|plain|ghost|danger" onPress label icon? disabled? haptic?>`; `<StatusPill status>`, `<StatusMark status size>`, `<DifficultyTag level>`, `<Segmented options value onChange>`.

- [ ] Step 1: `test/tokens.test.ts` parses `../frontend/app/globals.css` light and dark blocks and expects every `--name: #hex` to equal `tokens[scheme][camel(name)]`. `test/shared.test.ts` imports `@shared/data` and `@shared/graph` and expects `nextTopic(goalById.get(<a real goal>)!, deriveStatuses([], []))` to be a topic.
- [ ] Step 2: create the Expo app (SDK 58, Router, TS), add deps, Metro `watchFolders` for `../shared`, tsconfig path; run `npm test` → token test fails until `tokens.ts` is written; then passes.
- [ ] Step 3: UI primitives matching `ui.module.css`, 44px heights; fonts loaded in `_layout.tsx` with the splash held until ready.
- [ ] Step 4: `npx expo run:android` installs a debug build on the phone; it shows a primitives screen in light and dark.
- [ ] Step 5: commit `feat(mobile): the Expo app, the design system's tokens and shared/ on the phone`.

### Task 3: API client, secure session, sign-in screens, Google

**Files:** `src/lib/config.ts`, `api.ts`, `session.ts`, `pkce.ts`, `google.ts`, `app/(auth)/_layout.tsx`, `login.tsx`, `signup.tsx`, `src/ui/AuthForm.tsx`; tests `test/api.test.ts`, `test/pkce.test.ts`, `test/auth-form.test.tsx`.

**Interfaces:**
- Produces: `api<T>(path, {method?, body?}): Promise<T>`; `ApiError {status, code, message}` (status 0 = network); `signIn(kind: "login"|"register", body)`, `signInWithGoogle(): Promise<SignedIn | null>`, `restoreSession(): Promise<"signed-in"|"signed-out"|"offline">`, `signOut()`; `SignedIn = {student: Student}`; `newVerifier(): string`, `challengeOf(verifier): Promise<string>`.

- [ ] Step 1: tests: `api` sends `X-Trellis-Client: mobile` and the bearer token; on 401 refreshes once with the stored token and retries; two parallel 401s → one refresh call; refresh refused → stored token deleted, `onSignedOut` called; network error during `restoreSession` → `"offline"` and token kept. `challengeOf` matches RFC 7636's example (`dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk` → `E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM`).
- [ ] Step 2: implement; secure-store key `trellis.refresh`; Google: `openAuthSessionAsync(\`${SITE}/api/auth/google?desktop=${challenge}\`, "trellis://auth")`, parse `code` (64 hex), exchange.
- [ ] Step 3: screens in the web's auth layout (logo, title, fields, primary button, Google button, switch link, server errors shown under the form).
- [ ] Step 4: on the phone, sign up and log in against the local backend (`EXPO_PUBLIC_API_URL=http://<mac-lan-ip>:8000/api`).
- [ ] Step 5: commit `feat(mobile): sign-in with the refresh token in secure storage, and Google through Custom Tabs`.

### Task 4: Store, Start and the sort

**Files:** `src/lib/store.tsx`, `app/start/index.tsx`, `app/start/sort.tsx`, `app/index.tsx` (the gate); test `test/store.test.ts`.

**Interfaces:**
- Produces: `useStore(): {state: State, mode: "loading"|"live"|"offline", statuses, goal, act}`; `State` as the web's minus demo fields; `act.setSubject, setGoal, claim(claims), open(topicId), editCheckIn, removeCheckIn, editExperience, removeExperience, took(take), rename(name), requestSubject(text), reload(), signOut(), deleteAccount(password?)`; `reducer(state, action)` exported for tests.
- [ ] Step 1: reducer tests (hydrate, goal, claims, saved, message/undo removal, older) using `shared/data/student.ts` samples.
- [ ] Step 2: implement; the gate routes: no session → `/login`; no goal for any subject → `/start`; else `/(tabs)/map`.
- [ ] Step 3: Start and sort screens using `shortcutsOf`, `bigTopicsOf`, `unsortedAreas`; `POST /claims`, `PUT /goals/:subjectId`.
- [ ] Step 4: commit `feat(mobile): the store, Start and the sort`.

### Task 5: Map and Topic

**Files:** `app/(tabs)/_layout.tsx`, `app/(tabs)/map.tsx`, `app/topic/[id].tsx`, `src/map/*` (RouteList, Area, Summary, StuckCard, NextCard, TopicDiagram, PromptCard, SearchBar).
- [ ] Step 1: component tests: RouteList renders "Your route" with the goal's areas in `summarise()` order and "Not needed for this goal"; a stuck topic shows "may be" + the first suspect's name.
- [ ] Step 2: implement; topic as `formSheet` with detents [0.6, 1]; prompt via `buildPrompt`, Copy (expo-clipboard), ChatGPT/Claude (`Linking.openURL(chatGptUrl(..))`), Share; record `POST /prompt-takes`; Got it/Partly/Stuck call `helper.pick` and switch to the Helper tab; TopicDiagram draws needs → topic → unlocks with react-native-svg.
- [ ] Step 3: commit `feat(mobile): the map as a path list, and the topic sheet`.

### Task 6: Helper

**Files:** `src/lib/useHelper.ts`, `app/(tabs)/helper.tsx`, `src/helper/*` (Bubble, ConfirmCard, Chips, Composer).
- [ ] Step 1: tests: `say` posts `/helper/:subjectId/messages` and appends both messages; `save` posts `/helper/proposals/:id/save` and dispatches `saved`; chips come from `suggestionsFor`.
- [ ] Step 2: implement (live half of the web's `useHelper.ts`); keyboard-avoiding composer; haptics on Save/Undo.
- [ ] Step 3: commit `feat(mobile): the helper`.

### Task 7: Check-ins and Settings

**Files:** `app/(tabs)/check-ins.tsx`, `app/(tabs)/settings.tsx`, `src/lib/updates.ts`; test `test/updates.test.ts`.
- [ ] Step 1: tests: `isNewer("1.0.1","1.0.0")`, `isNewer("1.0.0","1.0.0") === false`, tag `v1.2.0` parsed; release JSON with an `.apk` asset gives its URL.
- [ ] Step 2: check-ins with edit and swipe-to-delete + Undo; settings: name, theme (System/Light/Dark saved with secure-store-free AsyncStorage), usage, export (file + share sheet), log out, delete account, version + Check for updates (GitHub `repos/niteshkumar7557/trellis-android/releases/latest`).
- [ ] Step 3: commit `feat(mobile): check-ins and settings`.

### Task 8: Icons, signing, release APK

**Files:** `mobile/scripts/icons.ts`, `app.config.ts` (icons, adaptive icon, shortcuts, predictive back), `package.json` script `apk`.
- [ ] Step 1: icons from `frontend/components/brand/brand.ts` with resvg; keystore with `keytool` at `~/.trellis/trellis-android.keystore`, passwords in `~/.gradle/gradle.properties`; a config plugin wires `signingConfigs.release` and `abiFilters arm64-v8a`.
- [ ] Step 2: `npm run apk` → `release/Trellis-<version>-arm64.apk`; `apksigner verify --print-certs`; install with `adb install`; full manual check on the phone (list in `docs/mobile.md`).
- [ ] Step 3: commit `build(mobile): the signed arm64 APK`.

### Task 9: CI, docs, ship

- [ ] Step 1: `mobile` job in `.github/workflows/ci.yml` (`npm ci`, typecheck, test).
- [ ] Step 2: docs: `docs/mobile.md` progress/decisions, `docs/codebase.md`, `docs/README.md`, `README.md`, `CLAUDE.md`; site download link ("Android app") in the landing footer and Settings.
- [ ] Step 3: ask the owner how to merge; push; wait for green CI; `./deploy/release.sh`; create `niteshkumar7557/trellis-android` and release `v1.0.0` with the APK.
