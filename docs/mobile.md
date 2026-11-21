# The Trellis Android app

An Android app for Trellis, built with **React Native** and **Expo**. Unlike the desktop app
(which shows the live site in a window), this one has **its own native screens**. It runs
the same domain code as the site (`shared/`) and talks to the same API.

It's a graded university elective (21 Nov 2026). The owner must explain every decision in a
viva, so every choice below names the alternatives and the trade-off.

Status: **design, waiting for the owner's approval (21 Nov 2026).** Branch `feature/mobile`.

---

## 1. What it is, and what it isn't

- **Is:** a native Android app with the site's design system rebuilt natively (§6): the same
  colours, font, statuses and rules, laid out for a phone, plus a few things only an app
  can do (§7).
- **Is:** signed-in only. Signed out, it opens on Log in. There's no sample student:
  `design.md` §14 puts "trying Trellis before signing up" outside v1, and the desktop app
  learned the hard way that an app with no landing page needs Log in first.
- **Isn't:** a WebView around the site. React Native has no HTML or CSS, so the web's
  components can't run in it; "the same UI" here means the same **design system**, drawn
  with native views.
- **Isn't:** offline Trellis. Every record lives in Postgres behind the API. Without a
  connection the app says so and offers Retry.
- **Has no** reminders, push notifications, streaks or badges (`design.md` §14; the desktop
  app's reminder was removed for this reason).

**Constraints**

- Android only, an **`.apk`**, built **locally** on the owner's M4 Mac and tested on his
  **Android 17** phone. No Play Store.
- **$0.** No Play Console ($25), no EAS Build plan, no paid service.
- `shared/` is used **as is**. Nothing changes for students using the site.

---

## 2. React Native and Expo in five minutes

**React Native** runs React components on a phone, but each `<View>`, `<Text>` or
`<ScrollView>` becomes a **real Android view**, not HTML. You write the same kind of
component code (state, props, hooks); there's no DOM and no CSS. Styles are JavaScript
objects (`StyleSheet.create`) with a subset of CSS's layout (flexbox, by default in a
column).

Two halves run on the phone:

| Half | What it is | In Trellis |
|---|---|---|
| **JavaScript** | Our code, compiled into one bundle and run by **Hermes** (React Native's JavaScript engine, made for phones) | screens, the store, the API client, and `shared/` |
| **Native** | Kotlin/Java code and Android views. Libraries reach it through **native modules** (e.g. secure storage asks the Android Keystore) | Expo's modules, the Android project |

**Metro** is React Native's bundler (the equivalent of webpack or Next's compiler). In
development it serves the bundle to the phone over the network, so a saved file shows up
in about a second ("Fast Refresh"). In a release build the bundle is compiled into the
`.apk`.

**Expo** is a set of tools and libraries on top of React Native:

- **modules** for things phones do (secure storage, haptics, the browser, the clipboard),
  each tested on every Android version Expo supports;
- **Expo Router**: one file per screen in `app/`, like Next's App Router, which the owner
  already knows;
- **prebuild**: it *generates* the Android project (`android/`) from `app.config.ts`, so we
  don't hand-edit Gradle and XML files. The generated folder is git-ignored and remade.

---

## 3. Approaches considered

**Build: Expo + prebuild + local Gradle (chosen)** vs **EAS Build** vs **React Native CLI**

- *Expo + prebuild + Gradle:* `npx expo prebuild` writes `android/`, then
  `./gradlew assembleRelease` builds the `.apk` on the Mac. Free, offline, nothing hidden.
- *EAS Build:* Expo's cloud builds. A free tier exists, but it needs an account and a
  queue, and the owner asked for local builds. (`eas build --local` still needs the
  account.)
- *Bare React Native CLI:* no Expo. The Android project is written and maintained by hand,
  and we'd pick and wire each native library ourselves. More native code to debug for no
  gain here.

**Screens: native (chosen)** vs **a WebView of the site**

- The owner asked for real native screens; a WebView is what the desktop app already does.

**Moving between screens: Expo Router (chosen)** vs **React Navigation set up by hand**

- Expo Router *is* React Navigation underneath, configured from files. File-based routes
  mirror the web's `app/` folder, so the owner can find a screen by its address.

**The map on a phone: a path list (owner, 21 Nov 2026)** vs **the full graph with pan and zoom**

- The web map is a large graph (React Native has 25 big topics and 159 subtopics) that's
  hard to read on a 6-inch screen. The web already switches to a list on narrow screens
  (`RouteList.tsx`, "On a phone this is the map"). The app does the same, natively, and
  each Topic screen adds a small drawing of what that topic needs and what it unlocks.

**State: a mobile store (chosen)** vs **moving the web store into `shared/`**

- `shared/` must stay free of React. The mobile store is modelled on
  `frontend/lib/store.tsx` (a reducer, the same `GET /api/state` shape) but signed-in only.
  The cost is about 300 lines that look like the web store's; derived facts still come
  from `shared/graph.ts`, so the rules aren't duplicated.

**Styling: `StyleSheet` + a token file (chosen)** vs **NativeWind (Tailwind for RN)** vs **Tamagui**

- Plain `StyleSheet` with the web's tokens is one layer the owner can read and debug.
  NativeWind and Tamagui add a compiler and their own rules.

**Storing the session: `expo-secure-store` (chosen)** vs **AsyncStorage** vs **react-native-keychain**

- secure-store encrypts with a key held in the **Android Keystore** (hardware-backed on
  most phones). AsyncStorage writes plain text: fine for a theme, wrong for a 60-day
  token. react-native-keychain is also good, but it's one more non-Expo native library.

**Releases: a public GitHub repo, `trellis-android` (owner)** vs **Play Store** vs **S3**

- Free, and the same pattern as `trellis-desktop`. Play Store costs $25 and takes days of
  review; S3 uses AWS credit.

**Updates: a check that points to the download (chosen)** vs **Expo Updates (over the air)**

- Over-the-air updates need a server (EAS Update, or one we'd host). The app asks GitHub
  for the latest release and, if it's newer, offers the download, like the desktop app.

---

## 4. Signing in

### Why the site's way doesn't work on a phone

The site keeps the long-lived **refresh token** in an `httpOnly` cookie, and the short-lived
**access token** (15 minutes) in memory (`backend-design.md` §4). Cookies belong to
browsers; a native app sends plain HTTP requests. So the app needs the refresh token **as
data**, and a safe place to keep it.

### The backend change (approved by the owner, 21 Nov 2026)

One request header switches the auth routes into **mobile mode**:

```
X-Trellis-Client: mobile
```

| Route | Today (browser) | With the header |
|---|---|---|
| `POST /api/auth/register`, `/login`, `/desktop/exchange` | sets the cookie; `{accessToken, student}` | **no cookie**; `{accessToken, refreshToken, student}` |
| `POST /api/auth/refresh` | reads the cookie | reads `{refreshToken}` from the body; answers `{accessToken, refreshToken}` |
| `POST /api/auth/logout` | reads the cookie | reads `{refreshToken}` from the body |

Everything else is unchanged: the same `refresh_tokens` table, only the token's SHA-256
stored, the same 60-day sliding expiry, no rotation (as in v1 for the site).

**Why this is safe:** a page on another site can't use mobile mode to steal a token. A
cross-site request with a custom header triggers a CORS "preflight" check, and the API
answers no CORS at all, so the browser never sends the request. Even without that, a
response to another origin can't be read. And `refresh`/`logout` in mobile mode only act
on a token the caller already has.

**Alternatives rejected:** separate `/api/auth/mobile/*` routes (they'd copy every
handler); a `client` field in each body (it touches every schema, and `refresh` has no
body today). CloudFront forwards every header on `/api/*` (`aws.md`,
`Managed-AllViewerExceptHostHeader`), so the header reaches the API.

### On the phone

- The **refresh token** lives in `expo-secure-store`. The **access token** lives only in
  memory, as on the web.
- At start: a stored token → `POST /api/auth/refresh` → signed in, load `GET /api/state`;
  none, or refused → Log in.
- On a 401 mid-session: refresh once and retry (the web client's logic); parallel
  requests share one refresh.
- Log out: `POST /api/auth/logout` with the token, then delete it from the phone.

### Google sign-in: the desktop hand-off, reused

Google refuses sign-in inside embedded web views, and RFC 8252 says a native app should use
the system browser. The desktop app already does this with a **one-time code** and **PKCE**
(`desktop.md` §5), and the phone reuses it. **No migration and no new page:**

```
App                                Chrome Custom Tab                    Backend
1. verifier (random, in memory);
   challenge = SHA-256(verifier)
2. open ─────────────────────────► GET /api/auth/google?desktop=<challenge>
                                   (signs in at Google)
                                   callback ─────────────────────────► one-time code (hash,
                                                                       2 minutes, challenge)
                                   /auth/desktop?code=… opens
                                   trellis://auth?code=…
3. Android hands the link back
   to the app; the tab closes
4. POST /api/auth/desktop/exchange {code, verifier}
   with X-Trellis-Client: mobile ────────────────────────────────────► {accessToken,
                                                                        refreshToken, student}
```

- **Chrome Custom Tabs** is Chrome running inside the app's task: a real browser (Google
  allows it, the student's Google session is there), but the app can't read what's typed.
  `expo-web-browser`'s `openAuthSessionAsync` opens it and waits for the `trellis://` link.
- **Why PKCE matters on Android too:** any app can claim `trellis://`. A thief that caught
  the link would hold the code but not the verifier, which never left our app's memory.
- *Rejected:* Google's native Android sign-in SDK. It needs an Android OAuth client tied
  to our keystore's fingerprint and a new way to check Google's tokens on the backend: a
  second sign-in path to maintain.

---

## 5. Screens

Paths are Expo Router files in `mobile/app/`.

| Screen | File | What it shows |
|---|---|---|
| Log in / Sign up | `(auth)/login.tsx`, `signup.tsx` | Email and password, Continue with Google. "Forgot password?" explains the admin reset (as on the web) |
| Start | `start/index.tsx` | Pick a subject and a goal; "Learning something else?" saves a request |
| The sort | `start/sort.tsx` | One card per big topic: I know it / Shaky / New; the "I already know React" shortcut |
| **Map** (tab) | `(tabs)/map.tsx` | Subject and goal; the Stuck and Next cards; done / to learn / you can skip; **Your route** (big topics in order, opening into subtopics) and **Not needed for this goal**. Search at the top |
| **Topic** (sheet) | `topic/[id].tsx` | Status, difficulty, Can skip / Don't skip with the reason, summary, the prompt (Copy, ChatGPT, Claude, Share), How did it go? (Got it / Partly / Stuck, through the helper), It needs / It unlocks with a small drawing, "may be why" when stuck, your notes, Look inside now |
| **Helper** (tab) | `(tabs)/helper.tsx` | The thread for the current subject; confirm cards with Save, then Undo; "how did it go?"; suggestion chips; older messages on scroll |
| **Check-ins** (tab) | `(tabs)/check-ins.tsx` | Every update and note; edit or delete |
| **Settings** (tab) | `(tabs)/settings.tsx` | Name, theme, AI usage (percent and reset time), export, log out, delete account, the app's version and Check for updates |

The web's **sidebar** (Map, Check-ins, Settings) becomes a **bottom tab bar**, the phone's
convention; the **helper**, which sits in the map's right-hand panel on the web, gets its
own tab, because a phone has no room beside the map. The topic panel's Got it / Partly /
Stuck buttons send the tap to the helper and switch to its tab, so every change still goes
through a confirm card.

```
┌───────────────────────────┐   ┌───────────────────────────┐
│ Trellis       React Native▾│   │ ───                       │  ← drag handle
│ ┌───────────────────────┐ │   │ React basics              │
│ │◆ Stuck: FlatList      │ │   │ Conditional rendering,    │
│ │  may be Objects and…  │ │   │ lists                     │
│ └───────────────────────┘ │   │ ◌ Said shaky  ▂▄▆ Easy    │
│ ┌───────────────────────┐ │   │ [Don't skip] FlatList     │
│ │◌ Next: Conditional…   │ │   │   builds on it.           │
│ └───────────────────────┘ │   │ ┌───────────────────────┐ │
│ 19/45   26        114     │   │ │ Your prompt           │ │
│ done    to learn  can skip│   │ │ I'm learning React…   │ │
│                           │   │ └───────────────────────┘ │
│ Your route  14            │   │ [Copy] [ChatGPT] [Claude] │
│ ○ What is React Native?   │   │ How did it go?            │
│ ◐ React basics          ⌄ │   │ [● Got it][◐ Partly][◆ …] │
│   ● JSX           ● Done  │   │ It needs  ──○──►●         │
├───────────────────────────┤   │                           │
│  Map  Helper Check-ins  ⚙ │   │                           │
└───────────────────────────┘   └───────────────────────────┘
          Map tab                       Topic sheet
```

---

## 6. The design system, rebuilt natively

The web's rules hold on the phone (CLAUDE.md "Rules for this codebase"):

- **Tokens:** `mobile/src/theme/tokens.ts` has every colour from
  `frontend/app/globals.css`, light and dark, hex for hex. **A unit test reads
  `globals.css` and fails if any token differs**, so the two can't drift.
- **The framed sheet:** a green-grey frame (`--ground`) around a white sheet
  (`--surface`, 16px top corners); colour on data only; a near-black primary button; no
  gradients; no resting shadows (the floating shadow only on things that float, as on the
  web).
- **IBM Plex Sans**, the weights the web uses, **built into the app** (from
  `@expo-google-fonts/ibm-plex-sans` at build time; nothing downloaded at run time).
- **Statuses** keep their shapes as well as colours (● done, ◐ learning, ◆ stuck, dashed ◌
  shaky, ○ know, faint ○ new), drawn with `react-native-svg` from the same geometry as
  `components/ui/Status.tsx`. **Difficulty** is the three-bar meter and a coloured word,
  never a filled pill.
- **Components** match `ui.module.css`: buttons (primary, plain, ghost, danger; 6px radius),
  pills, the segmented control, the Don't skip / Can skip tag. Heights grow from 32px to
  **44px** where a finger presses them: Android's minimum touch target is 48dp, and the
  web's 32px is a mouse size. That's the one deliberate change in size.
- **Pictures are SVG drawn in code** (`react-native-svg`): the logo mark, icons, statuses,
  the topic drawing. The launcher icon must be a bitmap on Android, so, like the desktop
  app, a build script renders it from the SVG mark in `components/brand/brand.ts`; the
  PNGs are generated and git-ignored.
- **Light and dark** follow the phone's setting, or the student's choice in Settings
  (System / Light / Dark, saved on the phone).
- **Motion** uses **Reanimated** (React Native's animation library; GSAP is web-only) and
  is skipped when the phone's "Remove animations" setting is on.

---

## 7. What only the app does

Each of these is a real phone feature, and none breaks `design.md` §14:

| Feature | What the student gets | How |
|---|---|---|
| **Topic as a bottom sheet** | The topic slides up over the map, half or full height, dragged down to close | Expo Router `formSheet` presentation (`react-native-screens`) |
| **Haptics** | A light tap on Save, Undo and the status buttons; a warning buzz on Delete | `expo-haptics` |
| **Pull to refresh** | Pull the map or check-ins down to reload the record | `RefreshControl` |
| **Share a prompt** | Send the prompt to any app (WhatsApp, Notes, an AI app), not just copy it | React Native's `Share` |
| **Open in the AI app** | ChatGPT and Claude open in their Android apps if installed, else the browser | `Linking` with the existing `chatGptUrl` / `claudeUrl` |
| **Swipe to delete a check-in** | Swipe left on a check-in to delete, with Undo in a toast | `react-native-gesture-handler` |
| **Predictive back** | Android 17's back gesture previews the screen underneath | `react-native-screens`, enabled in `app.config.ts` |
| **Edge to edge** | The frame colour runs under the status and navigation bars, as Android 15+ expects | `react-native-safe-area-context` |
| **Skeletons** | Grey shapes while the record loads, as on the web (`Skeleton.tsx`) | a small component |
| **App shortcuts** | Long-press the launcher icon: Map, Helper | Android app shortcuts in `app.config.ts`, opening `trellis://` links |

---

## 8. Layout of `mobile/`

```
mobile/
  package.json            scripts and dependencies (Expo SDK 58, React Native 0.88)
  app.config.ts           name, package id, scheme "trellis", icons, plugins, version
  metro.config.js         lets Metro read ../shared
  tsconfig.json           strict; "@shared/*" → "../shared/*", as in the other apps
  app/                    Expo Router screens (§5)
  src/
    theme/                tokens.ts, the theme provider, type sizes
    ui/                   Button, Pill, StatusMark, Difficulty, Segmented, Card, Icon, Skeleton…
    lib/
      config.ts           the API's address (the live site; a LAN address in development)
      api.ts              fetch + the access token in memory + refresh once on 401
      session.ts          the refresh token in secure storage
      pkce.ts             verifier and challenge                 (pure, unit-tested)
      google.ts           Google sign-in through Custom Tabs
      store.tsx           the record, act.* actions               (reducer unit-tested)
      updates.ts          the GitHub release check                (pure parts unit-tested)
  scripts/icons.ts        SVG mark → launcher icon PNGs
  test/                   jest-expo + React Native Testing Library
```

Generated and git-ignored: `android/` (from prebuild), `assets/generated/` (icons), build
output.

**How `shared/` gets in:** Metro is told to watch `../shared` (`watchFolders`), and the
`@shared/*` path from `tsconfig.json` resolves there, the same alias the frontend and
backend use. `shared/` imports nothing outside itself, so it runs on Hermes unchanged.

---

## 9. Building, testing, releasing

**Tools on the Mac (all free):** Node, Android Studio's SDK (platform 37, Android 17, is
installed), and a JDK that Gradle accepts. The Mac has only JDK 25; the build will use
the JDK bundled with Android Studio, or JDK 17 from Homebrew if Gradle needs it.
`adb` comes from the SDK's `platform-tools` (add it to `PATH`). The phone needs
**Developer options → USB debugging**.

| Command (in `mobile/`) | What it does |
|---|---|
| `npm start` | Metro, for a development build already on the phone |
| `npx expo run:android` | Generate `android/`, build a debug app and install it on the phone over USB |
| `npm run typecheck` | `tsc` with no output |
| `npm test` | jest-expo: pure logic, the reducer, components, the token check |
| `npm run apk` | Icons, prebuild, `./gradlew assembleRelease`: a signed, arm64 `.apk` |

**Signing:** Android installs only signed APKs. A **keystore** made once with `keytool`
(free) signs every release. It lives **outside the repo** (with its passwords in
`~/.gradle/gradle.properties`) and **must be backed up**: a phone refuses an update signed
by a different key, so losing it means every student must uninstall and reinstall.

**arm64 only:** one APK for 64-bit ARM phones (nearly every phone since 2019), about half
the size of a universal one. Same reasoning as the desktop app's Apple Silicon-only build.

**Installing:** students download the `.apk` from the release page and allow "Install
unknown apps" for their browser once. Google is starting to require developer verification
for installed apps in some countries; whether that reaches the owner's classmates is
checked before the release (§11).

**Releasing a version:** raise `version` (and `versionCode`) in `app.config.ts`; `npm run
apk`; `gh release create v<version> <apk> --repo niteshkumar7557/trellis-android`.

**CI:** a `mobile` job in `.github/workflows/ci.yml` runs `typecheck` and `npm test`. The
APK is built on the owner's Mac.

---

## 10. Decisions

| Date | Decision | Why |
|---|---|---|
| 21 Nov 2026 | Native screens with Expo, not a WebView (owner) | The elective is about React Native; the desktop app already shows the site |
| 21 Nov 2026 | Expo prebuild + local Gradle | $0, offline, no account |
| 21 Nov 2026 | The map is a path list; each topic has a small drawing (owner) | A 159-topic graph doesn't fit a phone; the web does the same on narrow screens |
| 21 Nov 2026 | The web's design system rebuilt natively, guarded by a token test (owner: "follow the same design system") | The web's code can't run in React Native; the test stops drift |
| 21 Nov 2026 | Touch targets 44px, not 32px | Fingers, not a mouse; Android's guideline is 48dp |
| 21 Nov 2026 | Helper as its own tab | No room beside the map on a phone |
| 21 Nov 2026 | `X-Trellis-Client: mobile` returns the refresh token in the body | Approved backend change; one switch, no copied routes |
| 21 Nov 2026 | Google through Custom Tabs + the desktop hand-off | Reuses tested code; no migration |
| 21 Nov 2026 | Refresh token in `expo-secure-store`, access token in memory | Keystore-encrypted; same split as the web |
| 21 Nov 2026 | Signed-in only; no reminders or notifications | `design.md` §14 |
| 21 Nov 2026 | arm64 APK, self-made keystore | Smaller; $0 |
| 21 Nov 2026 | Releases in a public `trellis-android` repo; an update check, not OTA (owner) | Free, like desktop |

---

## 11. Progress

| Step | State |
|---|---|
| 0. Design approved | waiting |
| 1. Backend mobile mode + tests | |
| 2. `mobile/` set up; `shared/` running; a debug build on the phone | |
| 3. API client, secure session, Log in, Sign up, Google | |
| 4. Store, Start, the sort | |
| 5. Map and Topic | |
| 6. Helper | |
| 7. Check-ins and Settings | |
| 8. Icons, signing, release APK on the phone, update check | |
| 9. CI, docs, merge (owner's choice of how), backend release, `trellis-android` release | |
