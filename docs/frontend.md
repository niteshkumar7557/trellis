# Trellis — frontend

How the frontend is built and how to change it safely. The product rules live in
`docs/design.md`; the backend plan in `docs/backend-design.md`. This file covers the screens,
the code map, the rules each part follows, the gotchas, and the **data contract** the
backend must serve.

**Status (12 Nov 2026):** the screens are finished and on `main`. It makes **no API
calls**. The topic graphs are real; the student, their history and the helper's "AI" are
stand-ins. `frontend/lib/store.tsx` is the one place to swap in the API (§11).

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

The sample student is saved in localStorage under **`trellis-demo-v4`**. Settings →
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
- **The landing page** is "a horticultural plate book" with its own scoped `--l-*` tokens.
  Its pictures are procedural SVG espaliers (`components/art/Espalier.tsx`).
- **No raster images, ever.** Every picture is SVG drawn in code (the owner's rule).
- **Motion is GSAP**, imported from `@/lib/gsap`, with `useGSAP` and a scope. Respect
  `prefersReducedMotion()`. On app screens motion is feedback only. CSS keyframes are fine
  for tiny loops (the hover flow, the typing dots).
- **Lint rules that bite:** React's lint forbids `setState` inside effects (lift state, or
  derive it) and reading refs during render. Don't wrap ref-reading functions in
  `contextSafe`; use `useCallback`.

## 4. Screens and routes

| Route | Screen | File |
|---|---|---|
| `/` | Landing | `app/page.tsx` → `components/landing/Landing.tsx` |
| `/login`, `/signup` | Auth (fake for now) | `app/(auth)/AuthForm.tsx` |
| `/start` | Pick subject and goal; anything else typed gets a fixed "Coming soon" | `app/start/page.tsx` |
| `/start/sort` | Sort the **big topics**, one card each (keys 1/2/3, Backspace) | `app/start/sort/page.tsx` |
| `/map` | The map (home) | `app/(app)/map/page.tsx` |
| `/check-ins` | Every update and note; edit or delete | `app/(app)/check-ins/page.tsx` |
| `/settings` | Account, theme, export, delete everything, restore sample | `app/(app)/settings/page.tsx` |

The app screens share `components/app/Shell.tsx`: sidebar (pages, subjects with progress,
the student) and top bar (search trigger, theme button).

### The map page

```
┌ frame ────────────────────────────────────────────────────────────────────────┐
│ Trellis            [ Search topics, notes and pages  ⌘K ]              ◐  N   │
│ ┌ sidebar ┐ ┌ sheet ────────────────────────────────────────────────────────┐ │
│ │ Map     │ │ React Native  Goal ▾                      18/31 · 13 · 48     │ │
│ │ Check-  │ │ [◆ Stuck: FlatList · may be State] [○ Next: State]  Map|List  │ │
│ │  ins    │ │ ┌ canvas ───────────────────────────┐ ┌ helper (drag ↔) ───┐ │ │
│ │ Settings│ │ │  graph grows upward    ┌ topic ─┐ │ │ chat, confirm cards│ │ │
│ │         │ │ │  arrows point the way  │ sheet  │ │ │ ▸ Prompt for State │ │ │
│ │ Subjects│ │ │  you learn             │        │ │ │                    │ │ │
│ │ React N.│ │ │               [− + Fit]└────────┘ │ │ [ What did you…  ↵]│ │ │
│ │ Redis   │ │ └───────────────────────────────────┘ └────────────────────┘ │ │
│ │ Nitesh  │ └──────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────────────┘
```

- **Header:** subject, goal select, figures (done / to learn / you can skip, counted in
  subtopics), Map|List toggle, and the **finding buttons**: *Stuck* (hover draws the "may be
  why" trace), *Next*, *New on your map*. Each opens its topic.
- **Canvas** (`MapCanvas`): the map; §7.
- **Topic sheet:** clicking a topic opens `TopicPanel` (subtopic) or `BigPanel` (big topic)
  in a sheet over the canvas's right edge. Esc or × closes it, and the helper stays put.
- **Helper** (right column): `Chat` driven by `useHelper`; §8. You can drag its edge
  (320–560px, or arrow keys on the edge) or fold it to a 52px strip. Width and folded state
  are saved in localStorage `trellis-helper-width`.
- The old Overview tab and the check-in bar are gone; don't bring them back.

## 5. Code map

```
frontend/
  app/                     routes (above); globals.css holds every token
  components/
    app/Shell.tsx          sidebar + top bar;   Search.tsx  ⌘K full-page search (§9)
    map/
      layout.ts            dagre layout: big topics, frames, links, midpoints, arrowheads (§7)
      MapCanvas.tsx        pan/zoom camera, hover chains, labels, trace, frame-open motion (§7)
      Rail.tsx             TopicPanel, BigPanel, PromptView (the three-part prompt), rows
      Chat.tsx             the helper's thread, confirm cards, folded prompt cards, compose
      useHelper.ts         runs the conversation against shared/helper.ts (the API later)
      RouteList.tsx        the list view (and the phone view), grouped by big topic
      MiniMap.tsx          the small whole-map drawing on /start
      TopicOptions.tsx     <optgroup> topic picker (check-ins edit form)
    landing/               the landing page;  art/Espalier.tsx  procedural SVG
    ui/                    Icon, Mark (logo), Status (StatusMark, StatusPill), ui.module.css
  lib/
    store.tsx              the client store (§10)
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
- `suspectsFor` (two steps down, weakest first), `claimSource`, `pastUnlocks` (from
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
  `{known, experiences[], instructions[], text, experienceIds}`.
- **Known:** template text from statuses, including the likely gap when stuck.
- **Experiences:** **this topic's own only**, newest first, at most 4. A `hard` one is left
  out once its `uses` reaches 2 (`MAX_HARD_USES`). `uses` goes up only when the prompt is
  **taken** (Copy, ChatGPT, Claude; the store's `used` action), never when it is viewed.
- **Instructions:** status lines, then the topic's own (its mistakes plus extras), then
  base. Base includes "don't remind me of past mistakes".
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

A `useReducer` context persisted to localStorage. State: `claims, checkIns, experiences,
messages, subjectId, goalIds, opened`, plus unsaved `selected`, `asking`. Derived on every
change: `statuses` (from `deriveStatuses`) and `goal`.

Actions: `hydrate, select, ask, subject, goal, claims, open, add, edit, remove, say, save,
cancel, undo, editExperience, removeExperience, used, erase, reset`.
- `save` turns a proposal into check-ins and experiences (ids `c…`, `e…`) and marks the card
  saved with those ids; `undo` deletes them.
- **StrictMode gotcha:** the save effect skips the untouched `initial` state; otherwise, in
  development, the sample overwrote saved data before it loaded. `reset` returns a copy of
  `initial` for the same reason.
- `clean()` drops saved rows that point at topics or goals that no longer exist.

## 11. Swapping in the backend

Only `lib/store.tsx`, `components/map/useHelper.ts` and `app/(auth)/AuthForm.tsx` should
change. The endpoint-by-endpoint mapping is in `backend-design.md` §9. Keep a demo mode on
the sample data for visitors without an account.

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
| `Experience` | `id, at, topicId, kind: "easy" \| "hard" \| "clicked", text` (their words)`, line` (clean)`, messageId?, uses?` |
| `Instruction` | `id, scope: "base" \| "status" \| "topic", status?, topicId?, text` (may use `{topic}`, `{gap}`) |
| `ChatMessage` | `id, subjectId, at, role: "student" \| "helper", text, cards?, asks?: { kind, pending: Proposal }` |
| `Card` | `confirm` (`proposal, state: open \| saved \| cancelled \| undone, saved?: {checkIns[], experiences[]}`) · `prompt` (`topicId`) · `choose` (`outcome, options[{label, topicIds, outcome?}]`) · `suggest` (`options[]`) |
| `Proposal` | `updates: {topicId, outcome}[], experiences: {topicId, kind, text, line}[], said`. Nothing is written until the student saves it |
| `Student` | `id, name, email, joinedAt, hasPassword, goals: {subjectId, goalId, since}[]` |
| `Status` | `new \| know \| shaky \| learning \| stuck \| done`: **derived, never stored** |

The endpoints that serve these are in `backend-design.md` §4.

## 13. Product changes agreed on 12 Nov 2026 (not built yet)

These came out of the design review. The reasons are in `design.md` §16. Each row says
where it is built. Until then, sections 1 to 12 describe the code as it stands.

### New or changed behaviour

| Change | Where it shows | Built in |
|---|---|---|
| **"How did it go?" on return.** If the student took a prompt and has not reported on that topic since, the helper shows one line: *"How did State go?"* with Got it · Partly · Stuck · Not yet. It shows only the latest such topic, only when the prompt was taken between 10 minutes and 14 days ago, and never says how long ago. The first three go through `helper.pick()`. "Not yet" hides it until the next visit and saves nothing | Top of the helper thread | M6.4 (`awaitingReport` in MS.3) |
| **Taking a prompt is recorded.** Copy, ChatGPT and Claude each send the topic and how it was taken. This replaces the `used` action and the `uses` counter | `PromptView` in `Rail.tsx`, prompt cards in `Chat.tsx` | M6.4 |
| **The stuck guess can name a done topic**, and uses the student's own words (design.md §8). The "May be underneath" rows and the trace need no new UI; a done topic simply appears there with its Done mark | Topic panel, the Stuck button, the trace | MS.1 |
| **Prompts show what worked underneath**: up to two lines from the topic's direct prerequisites. Hard notes show only while their topic is not done | `PromptView`, under "From my own notes" | MS.2 |
| **A short sort after a goal change**, for big topics the new goal needs that were never sorted. `/start/sort` deals only those cards | A line under the goal menu | M6.4 (`unsortedAreas` in MS.3) |
| **"Coming soon" requests are saved** | `/start`, the "Learning something else?" form | M6.4 |
| **Real sign-in.** Google works; password sign-up and login call the API | `AuthForm.tsx` | M6.2, M6.3 |
| **Forgotten password.** A line on the login page: *"Forgot your password? Email the admin from the address you signed up with."* with a mail link. A new page `/reset?token=…` sets a new password | `/login`, new `/reset` | M6.2 |
| **A landing page after Google sign-in**, `/auth/done`: it fetches a token and goes to `/start` or `/map` | New route | M6.3 |
| **Older chat history loads on scroll**: the first load brings the latest 50 messages per subject | `Chat.tsx` | M6.1 |

### Wording to change

| Where | Now | Change to |
|---|---|---|
| Sign-up page | "No streaks, no reminders, no one watching." | Keep it, and add one line: *"What you type to the helper is read by an AI model to work out the topic. Nothing is saved until you confirm."* |
| Settings → Privacy | "No teacher, admin, group organiser or classmate can see it…" | The exact promise in design.md §11: no other person has a screen that shows your record; the operator can technically reach the database and does not read it; helper messages are read by an AI model inside our AWS account, not used for training |
| Settings → Delete everything | "permanently. There is no undo." | Add: *"Backups that still hold it are deleted within 14 days."* Ask for the password again when the account has one |
| Settings → Account | Email is an editable field | Read-only in v1. Changing it needs a way to verify the new address |
| Topic panel and design copy | "ChatGPT, Claude or Gemini" | "ChatGPT or Claude", with Copy for any other AI. Gemini has no link that pre-fills a prompt |

### Planned changes to the data contract (`shared/types.ts`)

| Shape | Change |
|---|---|
| `Experience` | `uses` is removed |
| `Card` (confirm) | gains `proposalId`. Save, cancel and undo are addressed by it, not by message id and card position |
| `PromptTake` (new) | `id, topicId, via: "copy" \| "chatgpt" \| "claude", at` |
| `Student` | gains `hasPassword` (Google-only accounts have none). **Done in M2.1** |
| `ChatMessage` | student messages gain `readBy?: "tap" \| "model" \| "rules"`, for debugging only; not shown |
| `Reading` (new, in `shared/helper.ts`) | what a message says, whoever read it (backend-design.md §5) |

### Suggestions that were considered and left for later

- **Try before signing up** (sort and see the map first). Left until the first feedback.
- **A per-subtopic sort for "shaky" big topics.** The new stuck ranking covers most of it.
