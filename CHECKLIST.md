# Thread — build checklist

Ten features for v1, the foundations under them, and the edge cases that otherwise get
discovered in week 7.

`[ ]` not started · `[~]` in progress · `[x]` done · `[-]` cut, with a reason written in

**Owners:** **K** = Knowledge (Nitesh) · **C** = Continuity (Teammate 2)
**Spec:** [`docs/design.md`](./docs/design.md) · numbers in
[`docs/knowledge.md`](./docs/knowledge.md) and [`docs/continuity.md`](./docs/continuity.md)

`design.md` §4 is the list of what we are **not** building. Nothing joins this file
without something else leaving it.

---

# Foundations

Not features. Nothing runs without them.

## Database and deployment — K+C, week 1

- [ ] Postgres running locally in Docker, and in production
- [ ] `pgvector` extension enabled and confirmed on both
- [ ] Migration runner: ordered files, applied once, recorded in a table
- [ ] `reset` script — drop, migrate, seed, in one command
- [ ] `seed` script — Canon plus one demo account with a believable history
- [ ] Config module: every secret from the environment, nothing hard-coded
- [ ] Deployed and reachable from the internet **in week 1**, not week 8
- [ ] Migrations run automatically on deploy
- [ ] One backup, taken by hand, restored once, before week 8

## Accounts — C, week 1

- [ ] Sign up, log in, log out
- [ ] Passwords hashed properly
- [ ] Access token plus refresh token, refresh rotated on use
- [ ] Rate limit on login
- [ ] Delete account: every personal row gone, in one transaction
- [ ] Deletion screen says plainly what stays (anonymous counts only)

## The clock — K+C, week 1

- [ ] Every engine function takes time as a parameter
- [ ] A grep or lint rule for `new Date()` / `Date.now()` inside engine folders
- [ ] That check runs in CI and fails the build

**If this slips, feature 7 becomes untestable and the project dies quietly in week 6.**

## Fakes and the freeze — K+C, week 1

- [ ] A fake implementation of every function in both interfaces
- [ ] A switch to run the whole app on fakes
- [ ] Both halves demonstrably work standalone on fakes
- [ ] **Interfaces frozen and written into `design.md` §6 — end of week 1**

## Canon seed data — K, weeks 1–2

- [ ] Page format agreed and written down
- [ ] Offline generation script — runs on our machine, never in the product
- [ ] ~60 pages across two subjects: **computer networking**, and **React / frontend**
- [ ] The second subject is React on purpose — it is what the two learners study, so all four of us dogfood
- [ ] Every page: scope, **where the topic ends**, 1–3 specific sticking points
- [ ] Sticking points are specific — "people confuse X with Y", never "this is hard"
- [ ] 4+ aliases per topic: formal name, abbreviation, how someone types it at 11pm, **and how our users actually type** — Hinglish and code-mixed included
- [ ] Prerequisite links marked **hard** or **soft**
- [ ] Every link justified in one sentence; reject the rest
- [ ] **No cycles** — a checked, automated assertion
- [ ] Embeddings computed for every page *(feature 5 needs these in week 4)*
- [ ] A vector index that is actually used — check the query plan
- [ ] Count how many generated pages you rejected, and why *(this goes in the report)*

## Notifications — C, week 4

- [ ] VAPID keys generated and stored
- [ ] Service worker registered
- [ ] Subscribe endpoint, one subscription per device
- [ ] Send, with retry on transient failure
- [ ] Dead subscriptions pruned on permanent failure
- [ ] Works on desktop Chrome and Android. iPhone is out of scope — say so in the UI

## Basic screens — C, weeks 2–4

- [ ] Settings: check-in time, quiet hours, timezone
- [ ] History: everything studied, newest first, with what they typed
- [ ] Every screen works on a phone
- [ ] Every screen works with **no data at all** — a new account never looks broken

## The simulator — C, week 3

- [ ] Personas: diligent, avoider, busy, sporadic
- [ ] Generates study events already attached to topics — does not wait on feature 5
- [ ] Replays six weeks against an injected clock, in under a second
- [ ] Asserts on outcomes, not just runs
- [ ] A command that replays one persona and prints what Kero did, day by day

**Build it in week 3, not week 7.** It is the only way to test feature 7 without waiting
real days, and it is half the demo.

---

# The ten features

## 1. Goal and route — K, week 2

The spine. Everything hangs off having an ordered path.

**Tables:** `goals`, `routes`, `route_waypoints`
**Provides:** `routeFor(goalId)`, `nextStep(userId)`

### Build
- [ ] Create a goal: one topic, or a named set of topics
- [ ] Prerequisite closure — walk back from the goal, as a **recursive query**
- [ ] Topological order — nothing before what it depends on
- [ ] Tie-break: fewest remaining prerequisites, then smaller topic
- [ ] Waypoint kind: **learn**, **check** or **skippable**
- [ ] Waypoint state: waiting, active, stalled, done, skipped
- [ ] **Only the next three unfinished waypoints are active**
- [ ] Changing a goal recomputes from scratch; the old route is superseded, not deleted
- [ ] Route screen: learn, check and skippable visibly separated

### Edge cases
- [ ] A cycle in the graph — detect and refuse, do not loop forever
- [ ] A goal with no path to it from anywhere
- [ ] A goal the user has already mastered — route is empty, and the screen says so well
- [ ] A required set larger than 40 topics — does the screen still make sense?
- [ ] A goal that is a set: the required set is the union, deduplicated

### Tests
- [ ] Randomly generated DAGs, not just the seed data
- [ ] Order validity asserted on every generated case
- [ ] Cycle detection has its own test
- [ ] Recompute preserves the old route

**Done when** a goal produces a correctly ordered route on generated graphs.

## 2. Onboarding — what you already know — K, week 6

Every one of your first users is already mid-subject. Without this, Thread tells someone
three weeks into networking to go and learn what an IP address is, and they leave.

**Tables:** `topic_mastery` (with a declared/evidence flag)

### Build
- [ ] Signup names the subjects we cover **before** anyone sorts anything
- [ ] Show the goal's required topics, **15 at a time**
- [ ] Three-way sort: know it / shaky / never seen
- [ ] Store as **declared**: know it → 0.55, shaky → 0.30, never seen → 0
- [ ] Declared knowledge is flagged, and fades at **half** the normal half-life
- [ ] A declared-known topic becomes a **check** placed late — never work placed early
- [ ] Three numbers: "7 to learn, 4 you can skip, 3 quick checks"
- [ ] Only "to learn" is the headline number
- [ ] Ends with one thing to do **and a prompt in hand**
- [ ] Progress saved — someone can close it halfway and come back

### Edge cases
- [ ] They mark everything as known → route is empty. What does the screen say?
- [ ] They mark nothing and skip the whole step
- [ ] They abandon halfway and return two days later
- [ ] They change goal later — do we re-ask for the new topics only? (Yes. Never re-ask
      about a topic they already sorted.)

### Tests
- [ ] Timed end to end on someone who has never seen it: **under five minutes**
- [ ] A user who declares half the subject gets a route that respects it

**Done when** somebody who already knows half the subject is not handed it as work.

## 3. Skip analysis — K, week 6 ★

The one nobody else does. Subjects feel unbounded, so stopping costs nothing. A number
that goes down is the fix.

**Provides:** `skipAnalysis(goalId)`, `explainWaypoint(routeId, topicId)`

### Build
- [ ] **Required** — reachable from the goal through **hard** links only
- [ ] **Optional** — in the set, but every path to it crosses at least one soft link
- [ ] **Skippable** — in the subject, not needed for this goal at all
- [ ] An explanation for every classification, naming real topics
- [ ] Labelled "not required for this goal", never "not important"
- [ ] Skipping a topic marks the waypoint, and it can return if the goal changes

### Edge cases
- [ ] A topic reachable by both a hard path and a soft path → **hard wins**
- [ ] Long chains of soft links — still optional, however deep
- [ ] A goal that is a set of topics: required is the union
- [ ] Everything is required — the screen must not look broken saying "0 you can skip"

### Tests
- [ ] A hand-built graph with a known correct answer, written down in the test
- [ ] Every skippable topic in the seed data, explained out loud by you, once

**Done when** you can pick any skippable topic and justify it in one sentence.

## 4. The daily question — C, week 2

**Tables:** `checkins`, `user_prefs`, `push_subscriptions`

### Build
- [ ] Scheduler job finds who is due, at their **local** time
- [ ] Quiet hours respected (default 22:00–08:00)
- [ ] Not sent during a pause
- [ ] Not sent if they already logged something today
- [ ] The wording: *"What did you get through today? Anything you bounced off?"*
- [ ] Delivered as a push notification
- [ ] **Also a card on the home screen** — Thread must work for someone who refused
      notification permission
- [ ] `checkins` row records sent, answered, and current conversation state

### Edge cases
- [ ] A user in a different timezone from the server
- [ ] A user who changes timezone mid-week
- [ ] The server was down over their window — send late, or skip? Decide and write it down
- [ ] Two devices subscribed — one notification, not two
- [ ] Permission never granted — the card must carry the whole experience

### Tests
- [ ] Job run twice produces one check-in, not two
- [ ] Nothing sent across a pause boundary
- [ ] Correct local hour for a user twelve hours away

**Done when** it arrives at the right local time for a user in another timezone.

## 5. Understanding the reply — K matcher, C conversation, week 4 ★

**Provides:** `resolveTopic(text)` · **Tables:** `study_events`

### Build
- [ ] Embed the reply, search the vector index
- [ ] Exact alias matching first — it is cheaper and more certain
- [ ] **≥ 0.80** accept · **0.55–0.79** offer up to three choices · **< 0.55** off-map
- [ ] Off-map is honest — "I do not know that topic yet" — and **the text is kept**
- [ ] One clarifying question maximum, expiring after 60 minutes
- [ ] Unanswered after 90 minutes, and nothing is lost
- [ ] Capture minutes and how it felt, including **bounced**
- [ ] Unresolved text can be re-resolved later in batch
- [ ] A file of 50 real sentences **written the way our users actually write** — messy, abbreviated, some Hinglish — with the topic you meant

### Edge cases
- [ ] A reply naming two topics — record both, or ask? Decide and write it down
- [ ] "nothing today" — a valid, unpunished answer, and an input to feature 7
- [ ] Nonsense, or an empty reply
- [ ] A reply arriving three days after the question
- [ ] A reply to a clarification that has already expired
- [ ] Minutes not mentioned at all — assume nothing, ask nothing, store null

### Tests
- [ ] The 50-sentence corpus, scored, with the score written down
- [ ] Deliberately ambiguous sentences produce choices, never a silent guess

**Done when** 45 of 50 land correctly and the other five ask instead of guessing.

## 6. Mastery and next step — K, week 3

**Tables:** `study_events` (append-only), `topic_mastery` (projection)

### Build
- [ ] Gain by feeling — **applied 0.30**, easy 0.25, ok 0.18, hard 0.10, bounced 0.00
- [ ] **Mastery from reading alone capped at 0.60** until an `applied` event or a recall check exists
- [ ] Scaled by `min(minutes, 60) / 60`
- [ ] Second and later events on a topic the same day count at 25%
- [ ] **Cap of 0.30 per topic per day** — cramming does not make an expert
- [ ] `bounced` adds nothing but records the difficulty for feature 7
- [ ] Fading: half-life 14 days × distinct study days, capped at 180
- [ ] Declared-only mastery fades at half that, until real evidence arrives
- [ ] **Rebuild command** — delete the table, replay the log, identical numbers
- [ ] Nothing outside Knowledge writes to `topic_mastery`
- [ ] `nextStep` returns a topic **and a reason**

### Edge cases
- [ ] Events arriving out of order, or backdated
- [ ] An event on a topic that is on no route
- [ ] Mastery crossing 0.70 mid-route — the topic leaves the route cleanly
- [ ] A topic with no events, only decay

### Tests
- [ ] Rebuild determinism proved on a large random log
- [ ] The daily cap enforced under many events
- [ ] Decay maths, on its own, with no database

**Done when** the rebuild is proved on a large random log.

## 7. Noticing, and knowing why — C, week 6 ★

**Tables:** `stalls`, `pauses`

### Build
- [ ] Stalls open only on **active** topics, after **4 days** with no event
- [ ] **Absence** — nothing studied at all. Shrink the plan and go quiet
- [ ] **Avoidance** — 3+ events on *other* topics, and this one was rated hard or bounced,
      or opened 3+ times with under 10 minutes logged
- [ ] Otherwise **unknown** — do nothing
- [ ] Confidence stored; below 0.5, never escalate past step 1
- [ ] The signals that produced the classification are stored with it
- [ ] **Never say the classification out loud** — check every string
- [ ] **Pause**: two taps from anywhere, total silence, no new stalls, clocks frozen
- [ ] Returning from a pause triggers nothing
- [ ] A stall closes the moment the topic is studied
- [ ] After 21 silent days it closes as **lapsed**
- [ ] After **21 days of total absence**, exactly one short message, then silence — someone can stop hearing from us by doing nothing

### Edge cases
- [ ] A pause beginning mid-stall — the clock freezes and resumes, it does not reset
- [ ] A topic falling out of the active three while stalled
- [ ] The goal changing while a stall is open
- [ ] An account deleted with stalls open
- [ ] A stall on a topic they then mark skipped

### Tests
- [ ] Avoider persona → avoidance. Busy persona → absence. Neither by accident
- [ ] Nothing fires across a pause boundary
- [ ] Job run twice → one stall

**Done when** the simulator produces the right classification for all four personas.

## 7b. Coming back — C, week 6 ★

The most important moment in the product, and the easiest to get wrong. Six weeks away,
then one evening they open Thread again.

**Binding rule:** `design.md` §5b.

### Build
- [ ] **One thing** on return, chosen from whatever they were closest to
- [ ] Every open stall closes quietly as **lapsed** before the screen renders
- [ ] **No accounting** — we never show what decayed while they were away
- [ ] **No comment on the gap** — no "welcome back", no "it has been 43 days"
- [ ] The route is not silently rearranged into something unrecognisable
- [ ] The daily question resumes as if the conversation paused mid-sentence

### Edge cases
- [ ] They return during a pause that has already expired
- [ ] They return to a goal that no longer makes sense to them — changing it must be easy
- [ ] They return and everything has decayed below "known" — do not present that as loss
- [ ] They return after the 21-day absence message and never answered it

### Tests
- [ ] A simulated learner absent six weeks: one message at day 21, then silence
- [ ] On return, one thing is offered and no stall is left open

**Done when** a six-week absence produces a screen with one step on it and no backlog.

## 8. The shrinking ladder — C, week 7 ★

**Tables:** `interventions`

### Build
- [ ] Step 1, at open — "fifteen minutes, nothing more"
- [ ] Step 2, +48h — one small idea inside the topic, with a prompt
- [ ] Step 3, +72h — the reroute (feature 9), with a prompt
- [ ] Step 4, +96h — offer the skip, and say what it costs
- [ ] Then silence, then lapse at 21 days
- [ ] Cap: 1 message per topic per 48h
- [ ] Cap: **2 messages per person per week, across all topics**
- [ ] Quiet hours respected by interventions too
- [ ] Any reply, study event, or app open → back to zero immediately
- [ ] Outcome recorded: resumed, ignored, dismissed, skipped
- [ ] Accepting the skip marks the waypoint skipped
- [ ] **Read every message aloud.** None may sound like an accusation

### Edge cases
- [ ] Two stalls escalating on the same day — the weekly cap decides, not the timer
- [ ] A reply arriving between sending and recording
- [ ] A stall reaching step 3 with no weak prerequisite found → skip to step 4
- [ ] A pause beginning between two steps

### Tests
- [ ] A user with five stalls gets at most two messages in a week
- [ ] De-escalation tested from every step
- [ ] The whole ladder replayed in the simulator in under a second

**Done when** the five-stall cap test passes.

## 9. The reroute — K, week 7 ★

The graph's payoff, and the thing no other tool can do.

**Provides:** `weakPrerequisite(userId, topicId)`

### Build
- [ ] Walk the stalled topic's prerequisites, one level, then two
- [ ] Filter to those with weak mastery
- [ ] Rank: hard links before soft, then lowest mastery
- [ ] Return one candidate, with a reason in words
- [ ] Feeds step 3 with a prompt aimed at *that* prerequisite

### Edge cases
- [ ] No weak prerequisite found — say so, and let the ladder go to step 4
- [ ] Several equally weak candidates — pick one, deterministically
- [ ] The prerequisite is itself stalled — do not reroute into a second stall
- [ ] The prerequisite was marked skippable — do not send them to it

### Tests
- [ ] A hand-constructed case with a known right answer
- [ ] The "no candidate" path reaches step 4 without crashing

**Done when** it names the right prerequisite on your constructed case.

## 10. The prompt — K, week 4 ★

Without this, Thread tells you what to do and hands you nothing to do it with.

**Tables:** `prompt_templates`, `compiled_prompts`

### Build
- [ ] Three intents: first pass, unstuck, decompose
- [ ] Assembled from the page's scope and sticking points
- [ ] Plus what this user has covered, and what they bounced off
- [ ] Includes the **boundary** — tell the other AI where to stop
- [ ] **No AI call on the live path.** Template rendering only
- [ ] Context snapshot stored, so the prompt stays explainable months later
- [ ] Copy button that works on a phone
- [ ] Shown at the end of onboarding, and at ladder steps 2 and 3

### Edge cases
- [ ] A user who has covered nothing yet — first-pass intent, no false claims
- [ ] A topic with no sticking points recorded — the prompt must still be useful
- [ ] Very long context — trim by relevance, not by truncation
- [ ] A topic whose prerequisites are all unmastered

### Tests
- [ ] An assertion that no network call to an AI happens while serving a request
- [ ] A prompt names only prerequisites the user has actually covered

**Done when** a compiled prompt never claims the user knows something they do not.

---

# Measurement — C, week 7

Not a feature. The thing that turns a claim into a result.

- [ ] `catches` — stalls where they returned within **14 days**
- [ ] `lapsed` — 21 silent days
- [ ] Check-in answer rate
- [ ] Intervention ignore rate
- [ ] **Holdout:** 20% of stalls, assigned **the moment the stall opens**, never re-rolled
- [ ] The **whole ladder** is delayed 48h for the holdout, not only step 1
- [ ] Compared on one fixed measure: studied within 14 days of the stall opening
- [ ] A single command that prints the comparison
- [ ] Written up honestly, **including if the answer is "no difference"**

# The two learners — Nitesh runs it

[`docs/learners.md`](./docs/learners.md). Their work never merges into a core file.

- [ ] Stage 1, React — waypoint row in three states, route list, three-number summary, empty state
- [ ] Stage 2, Next.js — landing page, about page
- [ ] Stage 3, TypeScript — types on their own components
- [ ] Stage 4, data — **Canon pages and prerequisite checking**, the highest-value task
- [ ] From week 5 — using Thread for real, reporting everything confusing
- [ ] Told, out loud, which of their work shipped and where it is running

---

# Weekly gate

One line a week. An unticked week means cutting scope, not extending the timeline.

- [ ] **W1** — foundations, fakes, deployed, clock check in CI, interfaces frozen, Canon started
- [ ] **W2** — a route computes; the daily question sends at the right local time
- [ ] **W3** — mastery rebuild proved; the simulator replays six weeks
- [ ] **W4** — text matching works; prompts compile; push and pause work
- [ ] **W5** — **the spine works end to end for one real user. Both of us start using it daily**
- [ ] **W6** — skip analysis; avoidance versus absence
- [ ] **W7** — the ladder, the reroute, the holdout
- [ ] **W8** — stop building. Fix, document, rehearse the demo on a real account

**Cut in this order if behind:** the holdout · ladder step 4 · check waypoints in
onboarding · off-map handling · fading. **Never cut feature 7b** — a product that punishes
someone for coming back is worse than no product.

**The spine, never cut:** ask → understand → update mastery → decide next → notice the
stall → respond → give a prompt.
