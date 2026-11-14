# Trellis — frontend

How the frontend is built and how to change it safely. The product rules live in
`docs/design.md`; the backend plan in `docs/backend-design.md`. This file covers the screens,
the code map, the rules each part follows, the gotchas, and the **data contract** the
backend must serve.

**Status (14 Nov 2026):** the screens are finished and connected to the API (M6, on
`main`). A signed-in student is **live**: their record comes from the backend.
A visitor who isn't signed in sees a **demo** on the sample student, kept in this
browser. How the two modes work is in §10 and §11.

**Still to build:** the design review of 12 Nov 2026 agreed a set of product changes. They
are listed in **§13** and built in milestone M6 (and MS for the `shared/` rules). Sections
1 to 12 describe the code as it is today.

## 1. Run and check

```bash
cd frontend && npm install && npm run dev     # http://localhost:3000 (the owner usually has it running)
npx tsc --noEmit && npx eslint . && npm run lint:shared   # must stay clean
node ~/.claude/skills/design-taste-frontend/scripts/inspect.mjs http://localhost:3000/map --app
```

The inspector writes to `.taste-skill/` (git-ignored). Expected results: app screens pass
with at most a "tiny text" warning on the map (node labels); the landing page always fails
"few pictures" and "no footage", because every picture is SVG by the owner's rule.

Demo mode (signed out) saves the sample student in localStorage under **`trellis-demo-v5`**.
Live mode keeps nothing in localStorage. Run the backend too (`CLAUDE.md`, "Run") to sign
in; `next.config.ts` forwards `/api/*` to it. Settings →
"Restore the sample data" resets it. Bump the key in `lib/store.tsx` whenever the saved
shape or the sample changes, so old saves don't load.

## 2. Stack

Next 16 (webpack, App Router), React 19, TypeScript strict, CSS modules plus tokens in
`app/globals.css` (Tailwind 4 is installed but barely used), IBM Plex Sans (the only
typeface), GSAP 3.13 + `@gsap/react` (plugins registered in `lib/gsap.ts`: Draggable,
DrawSVG, Inertia, ScrollTrigger), `@dagrejs/dagre` for map layout. No other runtime
dependencies. `next.config.ts` sets `devIndicators: false`.

## 3. Look and rules (don't break these)

- **Desktop first.** At 900px and below the map becomes the list, the helper sits below it
  and the topic sheet becomes a bottom sheet. No horizontal scroll at 390px.
- **Two themes**, light and dark: all colours are tokens in `app/globals.css`, nothing is
  hard-coded. The theme is set before paint by `themeScript` (`lib/theme.tsx`).
- **App screens use the "framed sheet" style:** a green-grey frame (sidebar and top bar), the
  work on a white sheet with a hairline edge. Colour goes on data only (topic statuses); the
  primary button is near-black; no gradients, no resting shadows (floating things such as
  the search pop-up and the topic sheet may use `--shadow-float`).
- **The landing page** is built on one idea, "the page is the map": the first screen is
  the real React Native map, drawn with the app map's own styles, and each section shows
  one thing Trellis does with it. It has its own scoped `--l-*` tokens, six type sizes, and
  a second typeface for headings (Fraunces). See §3a.
- **The brand** (mark, lockup, icons, share image) lives in `components/brand/`. See §3b.
- **No raster images, ever.** Every picture is SVG drawn in code (the owner's rule).
- **Motion is GSAP**, imported from `@/lib/gsap`, with `useGSAP` and a scope. Respect
  `prefersReducedMotion()`. On app screens motion is feedback only. CSS keyframes are fine
  for tiny loops (the hover flow, the typing dots).
- **Lint rules that bite:** React's lint forbids `setState` inside effects (lift state, or
  derive it) and reading refs during render. Don't wrap ref-reading functions in
  `contextSafe`; use `useCallback`.

### 3a. The landing page (redesigned 14 Nov 2026)

**Rule: nothing on it is typed in by hand.** `components/landing/sample.ts` runs the
shared code (`deriveStatuses`, `requiredFor`, `suspectsFor`, `buildPrompt`) on the sample
student, and every section draws from that. Why: a landing page with invented screenshots
drifts from the product the first time the product changes; this one changes with it.

| Section | File | What it shows |
|---|---|---|
| Hero | `HeroMap.tsx` | The 19 big topics as the app draws them: it uses the classes of `map/map.module.css` directly (`.closed`, `.edge`, `.arrowHead`), on the app's layout (size `plate` in `map/layout.ts`). **Live:** switch the goal to see what it lets you skip; pick a topic to read "Don't skip / Can skip" and why (`importanceOf`). |
| Stuck | `StuckTrace.tsx` | The "may be why" rule played by the scroll: pinned for about one screen, one GSAP timeline on `scrub`. |
| Prompt | `PromptSlip.tsx` | The real prompt for the stuck topic. Pointing at a source lights its part. Copy and the two links work. |
| Subjects, Won't do, Start, Footer | `Landing.tsx` | The two graphs at their real sizes (`MiniMap`), the promises beside the espalier, the one action. |

Things that are easy to break:

- **The finished picture is the default.** Each animation hides things and brings them
  back (`gsap.from`), so with no script, on a phone, or with reduced motion, the whole
  content is there. Keep it that way: never put a "hidden" starting state in the CSS.
- **Below 1100px the hero map is a miniature** (names hidden by CSS, boxes filled with the
  status colour). **Below 900px the stuck scene is not pinned** and its drawing is replaced
  by a ranked list (`.traceList`), because the drawing's text would be 6px tall.
- **The hero map is always the app's dark map** (class `.night`, the dark tokens copied
  from `globals.css`; keep them in step), because the hero's wall is charcoal in both
  themes and a light sheet glared against it. The trace, the prompt slip and the espalier
  follow the visitor's theme through the app's tokens.
- **The hero map shares the app map's CSS classes.** Changing `.closed`, `.edge` or
  `.arrowHead` in `map.module.css` changes the landing page too. That is on purpose.
- **Type (owner's call, 14 Nov 2026):** headings are **Fraunces** (a soft serif, loaded in
  `landing/fonts.ts` so only this page downloads it); paragraphs, buttons, the logo and
  every piece of the app shown on the page stay IBM Plex Sans. Sizes are the six `--t-*`
  steps at the top of `landing.module.css`; use one of them, don't add a seventh. The rest
  of the product is still Plex Sans only.
- **Trade-off:** the map is not the app's `MapCanvas` (no pan, zoom or open frames). It is
  a simpler drawing of the same layout and styles, so the landing page doesn't load the
  canvas code. The map is laid out in pixels and scaled to its width by one CSS variable
  (`--s`, set by a `ResizeObserver` in `HeroMap.tsx`).
- The design inspector fails this page on "few pictures" and "no footage". That is the
  SVG-only rule at work and is expected.

### 3b. Brand assets (added 14 Nov 2026)

Everything is drawn in code from one path, `MARK_PATH` in `components/brand/brand.ts`.

| What | File | Notes |
|---|---|---|
| The mark | `brand/Mark.tsx` | Takes the theme's green by default; `color` and `weight` exist for the images below. |
| The lockup (mark + name) | `brand/Logo.tsx` | Used by the sidebar, sign-in, setup, landing and 404. Inline styles, so the share image can use it too. |
| Browser-tab icon | `app/icon.svg` | Paper mark on a green tile, heavier stroke so it reads at 16px. A static file: it repeats the path by hand. |
| Apple touch icon | `app/apple-icon.tsx` | 180px PNG. |
| Home-screen icons | `app/pwa-icon/[kind]/route.tsx` | `/pwa-icon/192`, `/512`, `/maskable`. |
| Web manifest | `app/manifest.ts` | Name, colours, the icons above. |
| Share image | `app/opengraph-image.tsx` | 1200×630: lockup, the headline, the real map in miniature. |
| 404 page | `app/not-found.tsx` | The framed sheet with a bare espalier. |
| The espalier | `art/Espalier.tsx` | Four seasons as layers: bare, leaf, blossom, fruit. |

**Why there are PNGs when the rule is "no raster images":** no image file is kept in the
repo. Each PNG is drawn as SVG in code and rendered by Next during `next build`
(`ImageResponse`), then served as a static file. The PNG step can't be avoided: iOS
ignores SVG touch icons, Android needs 192 and 512px PNGs to offer "Install", and
WhatsApp, LinkedIn and X show no preview for an SVG share image.

**Where this falls short of production practice:**

- There is no `favicon.ico`. Every current browser reads `icon.svg`; only very old ones
  and a few feed readers still ask for `.ico`.
- The share image is the same for every page. Per-page images would need one
  `opengraph-image.tsx` per route.
- `ImageResponse` reads IBM Plex Sans from the `@fontsource/ibm-plex-sans` package at build
  time (it can't use the woff2 that `next/font` serves). That is one extra dependency.
- Link previews need absolute addresses. They come from `SITE_URL` in `brand.ts`
  (`NEXT_PUBLIC_SITE_URL`, default `https://trellis.niteshkumar.xyz`).

## 4. Screens and routes

| Route | Screen | File |
|---|---|---|
| `/` | Landing | `app/page.tsx` → `components/landing/Landing.tsx` |
| `/login`, `/signup` | Email and password; Google when it is turned on | `app/(auth)/AuthForm.tsx` |
| `/reset?token=…` | Set a new password with the admin's one-time link | `app/(auth)/reset/` |
| `/auth/done` | Where Google sign-in lands; sends on to `/start` or `/map` | `app/auth/done/page.tsx` |
| `/start` | Pick subject and goal; anything else typed gets a fixed "Coming soon" | `app/start/page.tsx` |
| `/start/sort` | Sort the **big topics**, one card each (keys 1/2/3, Backspace) | `app/start/sort/page.tsx` |
| `/map` | The map (home) | `app/(app)/map/page.tsx` |
| `/check-ins` | Every update and note; edit or delete | `app/(app)/check-ins/page.tsx` |
| `/settings` | Account, theme, AI usage (signed in), export, delete everything, restore sample | `app/(app)/settings/page.tsx` |
| any unknown address | 404, "This branch isn't on the map" | `app/not-found.tsx` |

The app screens share `components/app/Shell.tsx`: sidebar (pages, the student's subjects
with progress, the student) and top bar (search trigger, theme button). The sidebar lists
only **started** subjects (a goal is picked). **"New subject"** goes to `/start`, which lists
only subjects not started yet, plus the request form for anything else; once every subject
is started, it shows just that form.

### The map page

```
┌ frame ────────────────────────────────────────────────────────────────────────┐
│ Trellis            [ Search topics, notes and pages  ⌘K ]              ◐  N   │
│ ┌ sidebar ┐ ┌ sheet ────────────────────────────────────────────────────────┐ │
│ │ Map     │ │ Subject       Goal                        18/31 · 13 · 48     │ │
│ │         │ │ React Native  [Build and ship… ▾]                             │ │
│ │ Check-  │ │ [◆ Stuck: FlatList · may be State] [○ Next: State]  Map|List  │ │
│ │  ins    │ │ ┌ canvas ───────────────────────────┐ ┌ helper (drag ↔) ───┐ │ │
│ │ Settings│ │ │  graph grows upward    ┌ topic ─┐ │ │ chat, confirm cards│ │ │
│ │         │ │ │  arrows point the way  │ sheet  │ │ │ ▸ Prompt for State │ │ │
│ │ Your    │ │ │  you learn             │        │ │ │                    │ │ │
│ │ subjects│ │ │               [− + Fit]└────────┘ │ │ [ What did you…  ↵]│ │ │
│ │ React N.│ │ └───────────────────────────────────┘ └────────────────────┘ │ │
│ │ + New   │ │                                                              │ │
│ │ Nitesh  │ └──────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────────────┘
```

- **Header:** subject and goal, each with a small label (`GoalPicker.tsx`), figures (done / to learn / you can skip, counted in
  subtopics), Map|List toggle, and the **finding buttons**: *Stuck* (hover draws the "may be
  why" trace), *Next*, *New on your map*. Each opens its topic.
- **Subject vs goal:** the subject is what you learn; the goal is how far you go in it. The
  goal decides the route, so changing it changes Next, the figures and "Can skip"; check-ins,
  notes and the sort stay. Each option in the goal dropdown says what picking it would do
  ("31 topics, 19 done · 13 drop off vs now"), and after a change a note says what changed,
  with Undo.
- **Canvas** (`MapCanvas`): the map; §7.
- **Topic sheet:** clicking a topic opens `TopicPanel` (subtopic) or `BigPanel` (big topic)
  in a sheet over the canvas's right edge. Esc or × closes it, and the helper stays put.
  "Your prompt" shows a 160px preview that fades out, with "Show the whole prompt".
- **Helper** (right column): `Chat` driven by `useHelper`; §8. You can drag its edge
  (320–560px, or arrow keys on the edge) or fold it to a 52px strip. Width and folded state
  are saved in localStorage `trellis-helper-width`.
- The old Overview tab and the check-in bar are gone; don't bring them back.

## 5. Code map

```
frontend/
  app/                     routes (above); globals.css holds every token; icon.svg, apple-icon, manifest, opengraph-image (§3b)
  components/
    app/Shell.tsx          sidebar (with the AI usage meter) + top bar;   Search.tsx  ⌘K full-page search (§9)
    ui/Dropdown.tsx        our own dropdown (ARIA listbox); used instead of every <select>
    map/
      layout.ts            dagre layout: big topics, frames, links, midpoints, arrowheads (§7)
      MapCanvas.tsx        pan/zoom camera, hover chains, labels, trace, frame-open motion (§7)
      Rail.tsx             TopicPanel, BigPanel, PromptView (the three-part prompt), rows
      Chat.tsx             the helper's thread, confirm cards, folded prompt cards, compose
      GoalPicker.tsx       the goal dropdown, what a goal change does, the note after one
      useHelper.ts         runs the conversation against shared/helper.ts (the API later)
      RouteList.tsx        the list view (and the phone view), grouped by big topic
      MiniMap.tsx          the small whole-map drawing on /start
      TopicOptions.tsx     <optgroup> topic picker (check-ins edit form)
    landing/               the landing page (§3a): Landing, HeroMap, StuckTrace, PromptSlip, sample.ts
    brand/                 brand.ts (the mark's path, brand colours), Mark, Logo, images.tsx (§3b)
    art/Espalier.tsx       the procedural espalier drawing, four seasons
    ui/                    Icon, Status (StatusMark, StatusPill), ui.module.css
  lib/
    store.tsx              the client store (§10)
    usage.ts               the words for the AI allowance: which window, reset times, basic mode (§11)
    theme.tsx, gsap.ts     theme and motion setup
shared/                    the domain code; the backend runs the same files (import as @shared/*)
  types.ts                 every shape (the data contract, §12)
  data/react-native.ts     the React Native graph (reviewed content)
  data/redis.ts            the Redis graph (reviewed content)
  data/build.ts            helpers: big(), sub(), edgesFrom()
  data/index.ts            subjects, lookups (topicById, kids, bigOf…) and the data checks
  data/instructions.ts     prompt part 3 (a DB table later)
  data/student.ts          the sample student, history and conversation; TODAY = 2026-11-03
  graph.ts                 all derived logic (§6)
  prompt.ts                the three-part prompt builder (§8)
  parse.ts                 keyword reader: topic, outcome, reason, kind, tidy
  helper.ts                the helper's brain (stand-in for the AI; §8)
```

`shared/` sits outside `frontend/`. The frontend reaches it through the `@shared/*` path in
`tsconfig.json` and `experimental.externalDir` in `next.config.ts`. Keep it free of React,
Next and Node-only APIs, because the backend imports it too. `npm run lint` covers only
`frontend/`, so run `npm run lint:shared` as well. The Docker image builds from the repo
root (`frontend/Dockerfile`, `frontend/Dockerfile.dockerignore`), so it can copy `shared/`.

## 6. Content and derived logic

### Editing the topic graphs

- Two levels: `B(id, name, summary)` makes a **big topic**; `t(id, parentId, name, minutes,
  optional, summary, mistakes[], keywords[])` makes a **subtopic**. Ids: `rn-…` and `rd-…`.
- Names and grouping follow roadmap.sh; summaries, mistakes, links and core/optional marks
  are ours. Never copy roadmap.sh's descriptions. Credit lines exist on /start and in the
  landing footer.
- Links are `[from, to]` pairs meaning "from needs to" (or "helps"). Links join two big
  topics, or two subtopics. A subtopic may need one in another big topic **only if** its own
  big topic stands on that one; otherwise make it a "helps" link.
- `shared/data/index.ts` checks everything on load: no duplicate ids, a parent for every
  subtopic, at least one core subtopic per big topic, no missing ids, no cross-subject
  links, no loops, the cross-big-topic rule, and goals targeting big topics. **The console
  must stay silent.** To check outside the browser, run `index.ts` with `npx jiti`,
  overriding `console.assert` to collect failures.
- Goals: `targets` lists big topics; they bring everything they stand on.

### `shared/graph.ts` (the rules from design.md §6 and §8)

- `deriveStatuses`: a subtopic's latest check-in, else its own claim, else its big topic's
  claim. A big topic's status is summed up from its core subtopics.
- `requiredFor`, `summarise` (route, skippable, counts), `byRoute` (order),
  `isReady`, `nextTopic` (in-progress first, else the first ready one).
- `revealed`: a big topic opens on a check-in inside it, when next is inside it, when it
  holds a stuck topic's first suspect, or when the student opened it.
- `importanceOf`: "Don't skip" / "Can skip" plus a sentence, naming up to three dependents.
- `suspectsFor(stuckId, statuses, checkIns, experiences)` (two steps down, weakest evidence
  first; a done topic counts if it was hard or the student's words point at it;
  backend-design.md §7), `awaitingReport`, `unsortedAreas`, `claimSource`, `pastUnlocks` (from
  experiences), `progressOf`, and date helpers.
- **Never store derived facts.** Recompute them from claims, check-ins, experiences and
  opened.

## 7. The map

### Layout (`components/map/layout.ts`)

- dagre over **big topics only**, `rankdir: BT` (foundations at the bottom), nodesep 28,
  ranksep 56. A closed big topic is 212×58; an **open** one is a frame sized to hold its
  subtopics.
- Inside a frame, subtopics sit in rows by in-frame depth, at most 3 per row. Each row is
  ordered by where its prerequisites sit, so lines run upward. Gaps are 12px horizontal and
  **24px vertical** (room for arrowheads). Subtopic nodes are 188×36.
- Each `LaidEdge` carries `d` (SVG path), `mid`, `trail` (sample points for placing
  labels) and `head` (where the arrowhead goes and its angle). Lines between big topics are
  Catmull-Rom curves through dagre's points; links inside a frame or across frames use
  `link()`, a vertical cubic.
- **Arrowheads** are drawn as their own triangles (`Arrowhead` in MapCanvas), not SVG
  markers. The tip sits on the line's end, turned along its **last 8px**
  (`HEAD_LENGTH`). Markers used the single last pixel and looked crooked on bends. Don't
  straighten line ends to fix tips: that was tried and looked worse.
- Transforms are rounded to two decimals: the server and the browser otherwise differ in
  the last digit and break hydration.
- Layouts are cached by subject + open set.

### The canvas (`MapCanvas.tsx`)

- **Camera:** drag (Draggable with inertia), wheel to pan, Ctrl/⌘ + wheel or buttons to zoom
  (0.3–1.6). It opens fitted if the whole map is readable (≥ 0.72), else at 0.86 on the
  focus topic. Until the student moves the camera, it follows the focus as the map loads
  and grows. It brings the selected topic or trace into view, but never zooms below 0.62
  to do it, and keeps clear of the topic sheet (`rightInset`). Scroll on the viewport is
  pinned to 0: keyboard focus would otherwise scroll it.
- **Statuses** show on each node's mark; skippable topics are faded; optional ones have a
  dashed box; the next topic has an ink ring and a "Next" tag.
- **Lines:** solid means needed, dashed means helps (helps lines appear only for the topic in
  focus). Links that leave a frame show only for the topic in focus. On hover the
  prerequisite chain lights up, everything else dims, and pulses flow up the lit lines.
- **Labels:** names appear only for the hovered or selected topic's own lines: *needed
  first*, *unlocks*, *helps*.
  - A label sits on its line only if the line is long enough on screen to hold it and the
    spot covers no topic. Otherwise it becomes a small tag on the topic at the other end.
  - More than 3 lines of one kind are never named one by one: the focused topic gets a dark
    summary tag instead (*unlocks 7*).
  - Tags are placed first, then labels slide along their lines to clear tags, topics and
    each other.
  - Labels keep their size on screen at any zoom.
- **Stuck trace:** a red line drawn (DrawSVG) from the stuck topic down to its likely cause,
  with its own arrowheads and a *may be why* label. It shows while the Stuck button is
  hovered or a stuck topic is selected.
- **Motion:** when a big topic opens, the nodes slide to their new places (FLIP) and the
  new subtopics grow in; a status change pulses once. All of this is off for reduced
  motion.

## 8. The helper and prompts

### The helper (design.md §7; `shared/helper.ts` + `useHelper.ts` + `Chat.tsx`)

- **The stand-in for the AI.** `respond(input, ctx)` routes by patterns (explain, app
  guide, why stuck, skip, a report with an outcome, next) and reads with `parse.ts`. On the
  backend, one GLM 5 call (Amazon Bedrock) reads each typed message instead, and these
  rules are its fallback (backend-design.md §5). `afterSave()` writes the follow-up.
- **The flow:** a report gets **one question** first ("What's confusing about it?" / "What's
  still unclear?" / "What felt easy, and was anything hard?" / "What made it click?"). The
  helper message carries `asks: {kind, pending}`, and the next student message is taken as
  the answer, unless it is clearly a new question or a new report. Then comes a **confirm
  card** with the proposal: the student can change the outcome, kind or words, then Save or
  Cancel, with **Undo** after saving.
- **Details:**
  - The question is skipped when the message already gives a reason ("got flatlist, keys
    confused me").
  - "X was easy, but Y…" becomes two notes.
  - "Finished lists" asks which subtopics, with choice buttons.
  - "Explain X" hands back a prompt.
- **A new open proposal retires older open ones** (the store's `say` action), so a stale one
  can't be saved.
- The topic panel's Got it / Partly / Stuck buttons go through `helper.pick()`, so the
  question still follows. Search's "Ask the helper" goes through the store's `asking`.
- Prompt cards in the chat are **folded to one line** (Copy · ChatGPT · Claude) and unfold
  to the three parts.

### Prompts (design.md §9; `shared/prompt.ts`)

- Assembled, **never generated**: `buildPrompt(topic, statuses, checkIns, experiences, instructions)` →
  `{known, experiences[], instructions[], text}`.
- **Known:** template text from statuses, including the likely gap when stuck.
- **Experiences** (`experiencesFor`): this topic's own notes, newest first, at most 4, with
  a `hard` one kept only while the topic is not done; plus at most 2 "what worked" notes
  from the topics it directly needs (`clicked` first, then `easy`, never `hard`).
- **Instructions:** status lines, then the topic's own (its mistakes plus extras), then
  base. Base includes "don't remind me of past mistakes" and, last, `base-report-back`
  (end with two lines to paste back into Trellis).
- Taking a prompt (Copy, ChatGPT, Claude) calls `act.tookPrompt(topicId, via)`, which
  records a prompt take; viewing it doesn't.
- `PromptView` (in `Rail.tsx`) shows the three parts with labels, so it's clear where each
  line comes from.

## 9. Search (`components/app/Search.tsx`)

⌘K or the top-bar button opens a full-page pop-up (portal, focus trap, body scroll locked,
Esc closes):
- **Groups:** Jump to (stuck and next per subject, pages, subjects), Recent (empty query
  only), Topics, Big topics, Your notes (check-in text and experiences), and Ask the helper.
- Topics and big topics come from the current subject first, with a heading per subject.
- Filter chips with counts (Tab cycles them); ↑↓ move, ↵ opens, matches are highlighted.
- A preview pane shows the highlighted topic (where it sits, status, "Don't skip"/"Can
  skip"). It's hidden on phones.

## 10. The store (`lib/store.tsx`)

A `useReducer` context with **two modes** (`mode`):

| Mode | Who | Where the record comes from | Where changes go |
|---|---|---|---|
| `loading` | everyone, for a moment | — | — (the shell shows a blank sheet, so the sample never flashes up) |
| `demo` | not signed in | the sample student, or this browser's saved copy (`trellis-demo-v5`) | the reducer, then localStorage |
| `live` | signed in | `GET /api/state` | the API; the reducer applies the server's answer |

On load it tries one `POST /api/auth/refresh` (the refresh cookie). Success: live.
Failure: demo. A refresh that fails later (signed out elsewhere) drops back to demo.

State: `student, claims, checkIns, experiences, messages, moreMessages, promptTakes,
subjectId, goalIds, opened, usage` (the AI allowance; `null` in demo mode), plus unsaved
`selected`, `asking`. Derived on every change:
`statuses`, `goal`, and `today` (the sample's fixed day in demo, the real date live).

**Screens call `act.*`, never `dispatch` for record changes:** `setGoal, addClaims, open,
editCheckIn, removeCheckIn, editExperience, removeExperience, tookPrompt, rename,
requestSubject, loadOlder, refreshUsage, goLive, signOut, erase, reset`. Each does the local change in
demo mode, or the request and then the server's answer in live mode. A failed request
shows in the shell's error bar (`error`, `fail()`). `dispatch` stays for screen state:
`select`, `ask`, `subject`.

- Demo `save` turns a proposal into check-ins and experiences (ids `c…`, `e…`); live `saved`
  applies the server's rows and follow-up. Undo removes the saved ids either way.
- **StrictMode gotcha:** the save effect skips the untouched `demoInitial` state; otherwise,
  in development, the sample overwrote saved data before it loaded.
- `clean()` drops saved demo rows that point at topics or goals that no longer exist.

## 11. The API client and the helper

- **`lib/api.ts`**: every request goes to `/api/...` on this origin. The access token lives
  in memory only; a 401 refreshes once (shared by parallel requests) and retries. Errors
  arrive as `ApiError(status, code, message)`; the messages are written for people and are
  shown as they are.
- **`useHelper`**: demo mode runs `shared/helper.ts` here; live mode sends messages, taps,
  save, cancel and undo to `/api/helper/...`. A `409 proposal_not_open` reloads the record
  rather than showing an error (the card was decided in another tab).
- **Older chat** loads with "Show earlier messages" (live mode only; the first load brings
  the latest 50 per subject).
- **"How did State go?"** (`HowDidItGo` in `Chat.tsx`) uses `awaitingReport()`; the short
  sort after a goal change uses `unsortedAreas()` and `/start/sort?only=unsorted`.
- **Settings in live mode:** the name saves to the server, the email is disabled (not
  editable, and looks it), Download uses `GET /api/export`, and there is Log out. "Delete my
  record…" opens a pop-up (a native `<dialog>`) where the student types "delete my record"
  and, on password accounts, the password. "Restore the sample data" exists only in demo mode.
- **AI usage** (backend-design.md §5 "Cost limits"). The server sends `AiUsage`:
  percentages and reset times, never an amount. It arrives with `GET /api/state` and with
  every helper reply (`useHelper` dispatches `usage`), and `act.refreshUsage()` reads
  `GET /api/usage` when Settings opens and when a reset time passes with the tab open.
  Three places show it, all with words from `lib/usage.ts`:
  - **the sidebar** (`UsageMeter` in `Shell.tsx`): one meter above the account, for the
    window nearer its limit (`tighterWindow`), linking to Settings. Neutral fill, amber
    from 80%, and "Basic mode until 5:30 am" at the limit. On a phone it is in the menu;
  - **Settings → AI usage** (`AiUsageSection`): today and this week, each with its reset
    time in the student's own time zone, and what basic mode means when a limit is reached;
  - **the chat** (`Chat.tsx`): one line above the composer while a limit is reached.

  None of it shows in demo mode (the sample's helper calls no AI) or when the server runs
  with the AI off (`usage.on` is false). Amber, never red: reaching a limit is not an
  error.
- **Scrollbars** are themed in `globals.css` (thin, `--control` thumb): `::-webkit-scrollbar`
  for Chrome and Safari, `scrollbar-color` only where that isn't supported (Firefox), since
  Chrome ignores the first when the second is set.

## 12. Data contract

These are the shapes the screens consume (`shared/types.ts`). The backend returns the same.

| Shape | Fields |
|---|---|
| `Subject` | `id: "react-native" \| "redis", name, shortName, blurb` |
| `Topic` | `id, subjectId, parentId` (null for a big topic)`, name, summary, mistakes[], minutes, optional, keywords[]` |
| `Edge` | `from` (the dependent)`, to` (its prerequisite)`, kind: "needs" \| "helps"`: two big topics, or two subtopics |
| `Goal` | `id, subjectId, name, blurb, targets[]` (big topics) |
| `Claim` | `topicId, claim: "know" \| "shaky" \| "new", at`: from the sort, usually on a big topic |
| `CheckIn` | `id, at, text, topicId` (always a subtopic)`, outcome: "got" \| "partly" \| "stuck", messageId?` |
| `Experience` | `id, at, topicId, kind: "easy" \| "hard" \| "clicked", text` (their words)`, line` (clean)`, messageId?` |
| `Instruction` | `id, scope: "base" \| "status" \| "topic", status?, topicId?, text` (may use `{topic}`, `{gap}`) |
| `ChatMessage` | `id, subjectId, at, role: "student" \| "helper", text, cards?, asks?: { kind, pending: Proposal }` |
| `Card` | `confirm` (`proposal, state: open \| saved \| cancelled \| undone, saved?: {checkIns[], experiences[]}`) · `prompt` (`topicId`) · `choose` (`outcome, options[{label, topicIds, outcome?}]`) · `suggest` (`options[]`) |
| `Proposal` | `updates: {topicId, outcome}[], experiences: {topicId, kind, text, line}[], said`. Nothing is written until the student saves it |
| `Student` | `id, name, email, joinedAt, hasPassword, goals: {subjectId, goalId, since}[]` |
| `AiUsage` | `on, day: {usedPct, resetsAt}, week: {usedPct, resetsAt}, basic: "day" \| "week" \| "site" \| null`: the account's AI allowance. Percentages (0 to 100) and ISO times only |
| `Status` | `new \| know \| shaky \| learning \| stuck \| done`: **derived, never stored** |

The endpoints that serve these are in `backend-design.md` §4.

## 13. Product changes agreed on 12 Nov 2026 (not built yet)

These came out of the design review. The reasons are in `design.md` §16. Each row says
where it is built. Until then, sections 1 to 12 describe the code as it stands.

### New or changed behaviour

| Change | Where it shows | Built in |
|---|---|---|
| **"How did it go?" on return.** If the student took a prompt and has not reported on that topic since, the helper shows one line: *"How did State go?"* with Got it · Partly · Stuck · Not yet. It shows only the latest such topic, only when the prompt was taken between 10 minutes and 14 days ago, and never says how long ago. The first three go through `helper.pick()`. "Not yet" hides it until the next visit and saves nothing | Top of the helper thread | M6.4 (`awaitingReport` in MS.3) **Built in M6.** |
| **Taking a prompt is recorded.** Copy, ChatGPT and Claude each send the topic and how it was taken. This replaces the `used` action and the `uses` counter | `PromptView` in `Rail.tsx`, prompt cards in `Chat.tsx` | M6.4 **Built in M6**; `uses` removed in MS.2. |
| **The stuck guess can name a done topic**, and uses the student's own words (design.md §8). The "May be underneath" rows and the trace need no new UI; a done topic simply appears there with its Done mark | Topic panel, the Stuck button, the trace | MS.1 **Built.** |
| **Prompts show what worked underneath**: up to two lines from the topic's direct prerequisites. Hard notes show only while their topic is not done | `PromptView`, under "From my own notes" | MS.2 **Built.** |
| **A short sort after a goal change**, for big topics the new goal needs that were never sorted. `/start/sort` deals only those cards | A line under the goal menu | M6.4 (`unsortedAreas` in MS.3) **Built in M6.** |
| **"Coming soon" requests are saved** | `/start`, the "Learning something else?" form | M6.4 **Built in M6.** |
| **Real sign-in.** Google works; password sign-up and login call the API | `AuthForm.tsx` | M6.2, M6.3 **Built in M6.** |
| **Forgotten password.** A line on the login page: *"Forgot your password? Email the admin from the address you signed up with."* with a mail link. A new page `/reset?token=…` sets a new password | `/login`, new `/reset` | M6.2 **Built in M6.** |
| **A landing page after Google sign-in**, `/auth/done`: it fetches a token and goes to `/start` or `/map` | New route | M6.3 **Built in M6.** |
| **Older chat history loads on scroll**: the first load brings the latest 50 messages per subject | `Chat.tsx` | M6.1 **Built in M6, as a "Show earlier messages" button rather than on scroll:** predictable, works by keyboard, and never moves the thread while it is read. |

### Wording to change

Done in M6.2, except the topic-panel wording: no "Gemini" was left in the UI.

| Where | Now | Change to |
|---|---|---|
| Sign-up page | "No streaks, no reminders, no one watching." | Keep it, and add one line: *"What you type to the helper is read by an AI model to work out the topic. Nothing is saved until you confirm."* |
| Settings → Privacy | "No teacher, admin, group organiser or classmate can see it…" | The exact promise in design.md §11: no other person has a screen that shows your record; the operator can technically reach the database and does not read it; helper messages are read by an AI model inside our AWS account, not used for training |
| Settings → Delete everything | "permanently. There is no undo." | Add: *"Backups that still hold it are deleted within 14 days."* Ask for the password again when the account has one |
| Settings → Account | Email is an editable field | Disabled in v1. Changing it needs a way to verify the new address |
| Topic panel and design copy | "ChatGPT, Claude or Gemini" | "ChatGPT or Claude", with Copy for any other AI. Gemini has no link that pre-fills a prompt |

### Planned changes to the data contract (`shared/types.ts`)

| Shape | Change |
|---|---|
| `Experience` | `uses` is removed. **Done in MS.2** |
| `Card` (confirm) | gains `proposalId`. Save, cancel and undo are addressed by it, not by message id and card position. **In `shared/types.ts` since M3.4** (optional: the demo store has none) |
| `PromptTake` (new) | `id, topicId, via: "copy" \| "chatgpt" \| "claude", at`. **In `shared/types.ts` since M3.3** |
| `Student` | gains `hasPassword` (Google-only accounts have none). **Done in M2.1** |
| `ChatMessage` | student messages gain `readBy?: "tap" \| "model" \| "rules"`, for debugging only; not shown |
| `Reading` (new, in `shared/helper.ts`) | what a message says, whoever read it (backend-design.md §5). **Built in M4.1**, with `readByRules`, `readTap`, `replyFor`; `respond` is unchanged for the demo |

### Suggestions that were considered and left for later

- **Try before signing up** (sort and see the map first). Left until the first feedback.
- **A per-subtopic sort for "shaky" big topics.** The new stuck ranking covers most of it.
