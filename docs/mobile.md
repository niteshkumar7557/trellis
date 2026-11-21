# The Trellis Android app

An Android app for Trellis, built with **React Native** and **Expo**. Unlike the desktop app
(which shows the live site in a window), this one has **its own native screens**. It runs
the same domain code as the site (`shared/`) and talks to the same API.

It's a graded university elective (21 Nov 2026). The owner must explain every decision in a
viva, so every choice below names the alternatives and the trade-off.

Status: **1.0.0 published, 21 Nov 2026.** Download:
https://github.com/niteshkumar7557/trellis-android/releases/latest (linked from the landing
footer and Settings). Merged into `main` with a merge commit (`d7e48b6`); the backend's
mobile mode released the same day. Checked on the owner's Android 17 phone (motorola edge 70
fusion) with the release APK against the live site: Google sign-in, the map with a real
record, a topic, the helper (Got it → Save → Undo), Check-ins, Settings, dark mode. 70 tests.

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

Paths are Expo Router files in `mobile/src/app/` (Expo SDK 58's convention: screens in
`src/app`, everything else beside them in `src/`).

**Which screens exist** depends on the store's mode, with Expo Router's *protected routes*
(`Stack.Protected` in `src/app/_layout.tsx`): signed out, only Log in and Sign up; offline,
only "Can't reach Trellis"; signed in, the app. A screen whose guard turns false is removed,
so logging out in Settings lands on Log in by itself, and no screen checks "am I signed in?".

| Screen | File | What it shows |
|---|---|---|
| (the gate) | `index.tsx` | Not a screen: "/" exists in every mode and sends you on: Log in, "Can't reach Trellis", Start or the map |
| Log in / Sign up | `login.tsx`, `signup.tsx` (the form: `src/auth/AuthForm.tsx`) | Email and password, Continue with Google. "Forgot password?" explains the admin reset (as on the web) |
| Can't reach Trellis | `offline.tsx` | A session is stored but the server can't be reached: Try again (never Log in) |
| Start | `(app)/start/index.tsx` | Pick a subject and a goal; "Learning something else?" saves a request |
| The sort | `(app)/start/sort.tsx` | One card per big topic: I know it / Shaky / New, by swiping the card or tapping; the "I already know React" shortcut |
| **Map** (tab) | `(app)/(tabs)/map.tsx` | Subject and goal; the Stuck and Next cards; done / to learn / you can skip; **Your route** (big topics in order, opening into subtopics) and **Not needed for this goal**. Search at the top |
| Switch | `(app)/switch.tsx` | A sheet from the map's header: the subjects you've started (or Add a subject) and the goal |
| Search | `(app)/search.tsx` | Every topic in every subject, by name or keyword |
| **Topic** (sheet) | `(app)/topic/[id].tsx` | Status, difficulty, Can skip / Don't skip with the reason, summary, the prompt (Copy, ChatGPT, Claude, Share), How did it go? (Got it / Partly / Stuck, through the helper), It needs / It unlocks with a small drawing, "may be why" when stuck, your notes, Look inside now |
| **Helper** (tab) | `(app)/(tabs)/helper.tsx` | The thread for the current subject; confirm cards with Save, then Undo; "how did it go?"; suggestion chips; older messages on scroll |
| **Check-ins** (tab) | `(app)/(tabs)/check-ins.tsx` | Every update and note by day; tap to edit, swipe left to delete |
| **Settings** (tab) | `(app)/(tabs)/settings.tsx` | Name, theme, AI usage (percent and reset time), export, log out, delete account, the app's version and Check for updates |

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
| **Haptics** | A light tap on Save, Undo, a sorted card and Copy; a selection tick on choices; a warning buzz before a delete | `expo-haptics` |
| **Pull to refresh** | Pull the map or check-ins down to reload the record | `RefreshControl` |
| **Share a prompt** | Send the prompt to any app (WhatsApp, Notes, an AI app), not just copy it | React Native's `Share` |
| **Open in the AI app** | ChatGPT and Claude open in their Android apps if installed, else the browser | `Linking` with the existing `chatGptUrl` / `claudeUrl` |
| **Swipe the sort's cards** | Throw a card left (I know it), up (Shaky) or right (New to me), the directions the web's card flies; the buttons do the same | Gesture Handler `Pan` + Reanimated on the UI thread |
| **Swipe to delete a check-in** | Swipe left, then confirm. (No Undo: the API can't recreate a check-in, since only a saved proposal makes one) | `ReanimatedSwipeable` |
| **Predictive back** | Android 17's back gesture previews the screen underneath | `react-native-screens`, enabled in `app.config.ts` |
| **Edge to edge** | The frame colour runs under the status and navigation bars, as Android 15+ expects | `react-native-safe-area-context` |
| **Skeletons** | Grey shapes while the record loads, as on the web (`Skeleton.tsx`) | a small component |
| **App shortcuts** | Long-press the launcher icon: Map, Helper | `plugins/with-shortcuts.js` writes `res/xml/shortcuts.xml` and two vector drawables (XML, not bitmaps) opening `trellis://map` and `trellis://helper` |

---

## 8. Layout of `mobile/`

```
mobile/
  package.json            scripts; Jest's settings
  app.config.ts           name, package id, scheme "trellis", icons, splash, permissions, plugins, VERSION
  metro.config.js         lets Metro read ../shared, the brand mark and frontend/lib/usage.ts
  tsconfig.json           strict; "@shared/*" → ../shared, "@/*" → ./src
  plugins/
    with-release-signing.js  release builds signed with our key (or the build fails); arm64 only
    with-shortcuts.js        the launcher shortcuts
  scripts/
    icons.ts              SVG mark → launcher, adaptive and splash PNGs (assets/generated/)
    apk.sh                `npm run apk`: icons, prebuild, Gradle, the signed APK in release/
  src/
    app/                  the screens (§5): _layout.tsx (providers, guards), index.tsx (the gate),
                          login, signup, offline, auth, (app)/ (tabs, start, topic, switch, search)
    theme/                tokens.ts (= globals.css), theme.tsx (light/dark), type.ts (sizes, fonts)
    ui/                   Text, Button, Field, Frame, Row, Tag, Choice, Segmented, Status,
                          Difficulty, Icon, Mark, TopBar, Toast
    lib/
      config.ts           the API's address (the live site; EXPO_PUBLIC_API_URL in development)
      api.ts              fetch + the access token in memory + one shared refresh on a 401
      session.ts          the refresh token in expo-secure-store
      auth.ts             signIn, restoreSession ("signed-in" | "signed-out" | "offline"), signOut
      pkce.ts, google.ts  Google sign-in through Custom Tabs
      updates.ts          the GitHub release check
    store/                reducer.ts (pure) and store.tsx (the provider, act.*)
    auth/ start/ map/ topic/ helper/   the pieces of each screen
    console.d.ts          console.assert's standard type (shared/ needs it)
  test/                   Jest (jest-expo) + React Native Testing Library; setup.ts fakes native modules
```

Generated and git-ignored: `android/` (from prebuild), `assets/generated/` (icons),
`release/` (the APK).

**How `shared/` gets in:** Metro is told to watch `../shared` (`watchFolders`), and the
`@shared/*` path from `tsconfig.json` resolves there, the same alias the frontend and
backend use. `shared/` imports nothing outside itself, so it runs on Hermes unchanged. Two
details found while building: Babel adds helper imports to `../shared`'s files, so Metro and
Jest are told to look in `mobile/node_modules` for them; and React Native's types narrow
`console.assert` to booleans, which `src/console.d.ts` widens back (`shared/` stays unedited).

---

## 9. Building, testing, releasing

### The tools (all free; set up on the owner's Mac on 21 Nov 2026)

| Tool | Why | How it was installed |
|---|---|---|
| Node 24+ | Expo's CLI, Metro, Jest; runs `scripts/icons.ts` directly | already there (26) |
| **JDK 17** | Gradle and the Android Gradle plugin; the Mac's default Java is 25 | `brew install openjdk@17` (the `zulu@17` cask needs a sudo password; the formula doesn't) |
| Android SDK: platform 37 (Android 17), build-tools 37, **NDK 27.1.12297006** | compiling the app and React Native's C++ core; the versions React Native 0.88 asks for (`node_modules/react-native/gradle/libs.versions.toml`) | Android Studio had platform 37; the NDK folder was a broken partial download (no `source.properties`), so it was deleted and reinstalled with `sdkmanager`, which comes with `brew install --cask android-commandlinetools` |
| `adb` | install on the phone or emulator, read logs | in the SDK's `platform-tools` |

`scripts/apk.sh` sets `ANDROID_HOME` and `JAVA_HOME` itself. For other commands:

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home
export PATH=$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH
```

### Commands (in `mobile/`)

| Command | What it does |
|---|---|
| `npm install` | Dependencies. Add new ones with `npx expo install <pkg>`, which picks the version that matches SDK 58 |
| `npm run typecheck` | `tsc` on the app, then on the tests (which alone get Node's types) |
| `npm test` | Jest: tokens = `globals.css`, `shared/` runs, the UI pieces, the API client and session, PKCE, the Google link, the reducer, the routes (signed out → Log in), the map, the helper's requests, the update check, the signing plugin |
| `npm run android` | `expo run:android`: generate `android/`, build a debug app, install it on the phone or emulator |
| `npm start` | Metro, for a debug app already installed |
| `npm run icons` | The PNGs from the SVG mark |
| `npm run apk` | The signed release: `release/Trellis-<version>-arm64.apk` |

**Running against the local backend** (dev Postgres up, `cd backend && npm run dev`):
the app needs the Mac's address. On the emulator that's `10.0.2.2`; on a phone, the Mac's
Wi-Fi address (`ipconfig getifaddr en0`):

```bash
EXPO_PUBLIC_API_URL=http://10.0.2.2:8000/api npx expo start --dev-client
```

Google sign-in can't be tried this way (the callback returns to `localhost:3000`, which a
phone can't reach); try it against the live site after the backend release.

**Seen while testing (21 Nov 2026), so nobody is surprised:**

- The **debug** app asks "Allow Trellis to find… nearby devices?". That's Android 17's new
  local-network permission, triggered by talking to Metro on the Mac. The release app
  talks only to the internet and doesn't ask (checked on the release build). Android 17
  still lists `ACCESS_LOCAL_NETWORK` for the installed app although our manifest doesn't
  declare it; it appears to add it itself for apps targeting the previous SDK (36). That's
  an inference from the logs, not a documented fact.
- The emulator crashed twice with "bad color buffer handle" using the Mac's GPU, then hung
  on a crash-report dialog at the next start. `-gpu swiftshader_indirect` (software
  drawing) was stable; clear `/tmp/android-$USER/emu-crash-*.db` and the AVD's `*.lock`
  files if it refuses to start.

### Signing

Android installs only signed APKs, and installs an update only if it's signed with the
**same key**. The key is a keystore made once (21 Nov 2026) with `keytool`:

```bash
keytool -genkeypair -storetype PKCS12 -keystore ~/.trellis/trellis-android.keystore \
  -alias trellis -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Trellis, O=Trellis"
```

- **Where it lives (owner, 21 Nov 2026): `mobile/.env`**, which holds the keystore as
  base64 text (`TRELLIS_UPLOAD_KEYSTORE_BASE64`) and `TRELLIS_UPLOAD_KEY_ALIAS`,
  `…_STORE_PASSWORD`, `…_KEY_PASSWORD`. It's **git-ignored** (`mobile/.gitignore`: Expo's
  template ignored only `.env*.local`, because Expo expects `.env` to be committed), with
  owner-only permissions. The names never start with `EXPO_PUBLIC_`: Expo copies those
  into the app bundle, where anyone can read them.
- `npm run apk` (`scripts/apk.sh`) reads `.env`, writes the keystore to a temporary file
  that's deleted when the build ends, and hands the values to Gradle as
  `ORG_GRADLE_PROJECT_TRELLIS_UPLOAD_*` environment variables (Gradle reads those as
  project properties; a `-P` on the command line would show the passwords in the process
  list). Without `.env` the script stops.
- The original keystore is also kept in `~/.trellis/` (permissions 700/600).
- **Why `.env` isn't a backup:** it's on the same disk as `~/.trellis/`. **Keep a copy off
  this Mac** (a password manager, an encrypted drive). Lost, no update can ever be
  installed over 1.0.0: every student would have to uninstall (losing nothing, since the
  record is on the server, but still).
- The certificate says "CN=Trellis, O=Trellis", not a person's name: anyone can read it
  out of the APK.
- `plugins/with-release-signing.js` points release builds at it, and makes a release build
  **fail** without it. As generated, React Native signs releases with the public debug key.
- Its SHA-256: `c266b478…f80a05c2` (`apksigner verify --print-certs`).

**Short of production:** Play Store apps use *Play App Signing* (Google keeps the real key,
the developer an upload key that can be reset). At $0 with no Play listing, our one key is
both.

### The APK

- **arm64-v8a only** (`reactNativeArchitectures` in the plugin): every phone sold in years
  is 64-bit ARM. 31 MB; the all-architectures debug build was 250 MB (debug builds also
  carry the developer tools).
- **Permissions:** internet and vibration. Biometrics (from `expo-secure-store`'s optional
  fingerprint lock) and the Play install referrer (from `expo-application`) are blocked
  in `app.config.ts`, since Trellis uses neither.
- `minSdk 24` (Android 7), `targetSdk 36`, compiled against SDK 37: Expo SDK 58's defaults.
- Minify (R8) is off: it can strip code React Native libraries load by reflection, and
  the size win isn't worth that risk for a first release.

**Installing:** students download the `.apk` from the release page, open it, and allow
"Install unknown apps" for their browser once. **Developer verification** (checked 21 Nov
2026): Google's verification for installed apps starts 30 Sep 2026 in Brazil, Indonesia,
Singapore and Thailand and goes global "in 2027 and beyond"; no source names India in the
first wave. Installs over USB with `adb` stay exempt, and there's a free student/hobbyist
account for up to 20 devices with no ID or fee: the route when it reaches India.

### Releasing a version

1. The backend first, when it changed (mobile mode shipped with 1.0.0): the normal
   release (CLAUDE.md "Releasing"). **The APK must never reach students before the API it
   needs**: 1.0.0's sign-in needs mobile mode on the live site.
2. Raise `VERSION` and `VERSION_CODE` in `app.config.ts` and `version` in `package.json`
   (`apk.sh` stops if the two versions differ).
3. `npm run apk`, then install it on the phone and go through §12's checklist.
4. `gh release create v<version> release/Trellis-<version>-arm64.apk --repo
   niteshkumar7557/trellis-android --title "Trellis <version>" --notes "…"`. Running
   copies see it from Settings → Check for updates.

**CI:** the `mobile` job in `.github/workflows/ci.yml` runs `typecheck` and `npm test` on
every push. The APK is built on the Mac: a Gradle build on a runner costs ~10 free minutes
a push, and the keystore must never leave the Mac.

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
| 21 Nov 2026 | Offline is its own state, never "signed out" | Only a 401 from refresh deletes the token; a tunnel shouldn't sign anyone out |
| 21 Nov 2026 | Signed-in only; no reminders or notifications | `design.md` §14 |
| 21 Nov 2026 | Screens in `src/app` (not `app/`) | Expo SDK 58's convention, found in its docs while building |
| 21 Nov 2026 | Protected routes plus a root `index.tsx` gate outside the guards | Found on the emulator: with "/" only inside the signed-in group, a signed-out start redirected forever. Pinned by `test/routes.test.tsx` |
| 21 Nov 2026 | The helper's requests as plain functions given `post` and `dispatch` | Testable with fakes; the hook only wires them |
| 21 Nov 2026 | Import `frontend/lib/usage.ts` and the brand mark rather than copy them | The AI-allowance words and the mark stay one definition |
| 21 Nov 2026 | Swipe-to-delete confirms; no Undo | The API can't recreate a check-in (only a saved proposal creates one) |
| 21 Nov 2026 | Added a Switch sheet and a Search screen | The web's goal dropdown and sidebar subjects have no room on a phone |
| 21 Nov 2026 | arm64 APK, self-made keystore, release fails without it | Smaller; $0; never a debug-signed release |
| 21 Nov 2026 | Block biometric and install-referrer permissions | Least privilege: libraries add them, Trellis uses neither |
| 21 Nov 2026 | JDK 17 from Homebrew's formula | Gradle's tested JDK; the cask needed a sudo password |
| 21 Nov 2026 | Releases in a public `trellis-android` repo; an update check, not OTA (owner) | Free, like desktop |
| 21 Nov 2026 | The signing key in `mobile/.env`, git-ignored, read by `apk.sh` (owner); removed from `~/.gradle/gradle.properties` | One place for the key, next to the app. `.gitignore` gained `.env` first; the keystore goes to a temporary file per build; the values reach Gradle through environment variables, not the command line |

---

## 11. Progress

| Step | State |
|---|---|
| 0. Design approved | done (owner, 21 Nov 2026) |
| 1. Backend mobile mode + tests | done: unit 338, integration 99 |
| 2. `mobile/` set up; `shared/` running; a debug build | done |
| 3. API client, secure session, Log in, Sign up, Google | done (Google not yet tried end to end: needs the backend release) |
| 4. Store, Start, the sort | done; checked on the emulator |
| 5. Map and Topic | done; checked on the emulator |
| 6. Helper | done (unit-tested; the conversation itself not yet tried on a device) |
| 7. Check-ins and Settings | done (unit-tested; not yet tried on a device) |
| 8. Icons, signing, release APK, update check | done: `Trellis-1.0.0-arm64.apk`, installed and opened on the emulator |
| 9. CI, docs | done |
| Shipped (21 Nov 2026) | merged (`d7e48b6`, merge commit), CI green, backend released, checked on the owner's phone, `trellis-android` created, **v1.0.0 published** (SHA-256 `23f14e69…2d4b39`) |
| Not yet tried on a device | email sign-up on the live site, Share and the AI apps, swipe-to-delete, export, airplane mode, the launcher shortcuts (all unit-tested or tried on the emulator) |

---

## 12. Checking a build on the phone

Before publishing, on the owner's Android 17 phone with the release APK:

1. Install (`adb install release/Trellis-<v>-arm64.apk`, or open the file); it opens on Log in.
2. Sign up with email; Start; sort with swipes and buttons; the map appears.
3. Open a topic: the sheet, Copy, Share, ChatGPT and Claude (the app opens if installed).
4. Got it on a topic → the helper asks one question → the confirm card → Save → Undo.
5. Type a message to the helper; check-ins: edit one, swipe one away.
6. Settings: theme (light, dark), export (the share sheet), Check for updates.
7. Log out → Log in; kill the app and reopen: still signed in. Airplane mode → reopen:
   "Can't reach Trellis", and Try again works once back online.
8. Continue with Google (needs the backend release): Chrome opens, Google, back in the app.
9. Long-press the icon: Map and Helper shortcuts.

**Known limits** (honest, for the viva):

- Updates are manual (download and install); no Play Store, no over-the-air updates.
- The first install needs "Install unknown apps" allowed for the browser.
- A stolen phone's token is a 60-day session until logout, as a stolen cookie is (no
  refresh-token rotation in v1, for either client).
- The helper's thread scrolls a plain list; very long threads load 50 at a time with
  "Show earlier messages".
- Google sign-in may need the "Open Trellis" button on `/auth/desktop` if Chrome doesn't
  follow the page's automatic jump to `trellis://`.
