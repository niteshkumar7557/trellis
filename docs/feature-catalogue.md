# Every feature we have considered

The full list, so a decision is made once and not reopened. ★ unique — nobody else does
this. ✓ ordinary but required. · nice to have.

**Version 5 of `design.md` selected four: A3, B2, B7, B8.** This file is the menu it was
chosen from.

---

## Foundations — not choosable

Nothing runs without these, so they are not part of any count.

| ID | Item |
|---|---|
| F1 | Accounts: sign up, log in, tokens |
| F2 | Database, migrations, seed and reset scripts |
| F3 | Deployment and CI |
| F4 | Some way for study to get in — either the daily question (B1/B2) or a manual form (E3) |
| F5 | Injected clock everywhere |
| F6 | Canon seed data — the topic pages themselves (C1) |

## A — Knowledge and the map

| ID | Feature | | Needs |
|---|---|---|---|
| A1 | Topic graph with hard/soft prerequisite links | ★ | C1 |
| A2 | Goal → an ordered route | ✓ | A1 |
| A3 | **Skip analysis** — "7 to learn, 4 you can skip" | ★ | A1, A2 |
| A4 | Onboarding sort: know / shaky / never seen, stored as checks not work | ★ | A2 |
| A5 | Mastery calculated from study events | ✓ | F4 |
| A6 | Fading — mastery decays, slower for topics studied on separate days | · | A5 |
| A7 | "Why is this on my route?" — the chain to the goal, in words | ★ | A2 |
| A8 | **Weak-prerequisite lookup** — find the real cause of a stall | ★ | A1, A5 |
| A9 | Matching free text to a topic (meaning + aliases) | ✓ | C1, C5 |
| A10 | Off-map honesty — "I do not know that topic yet", and keep the text | ✓ | A9 |
| A11 | Change or abandon a goal; skipped topics can return | · | A2 |
| A12 | Finishing a goal — a real state and screen | · | A2 |
| A13 | Only the next three topics are active | ✓ | A2 |

## B — Continuity and Kero

| ID | Feature | | Needs |
|---|---|---|---|
| B1 | Daily question, scheduled at local time, quiet hours | ✓ | — |
| B2 | **One line a day** — free text reply lands on a topic | ★ | B1, A9 |
| B3 | The question also as an in-app card (works without notifications) | ✓ | B1 |
| B4 | Adaptive frequency — ask less when they are not studying | · | B1 |
| B5 | Do not ask if they already logged today | · | B1 |
| B6 | Stall detection on active topics | ✓ | A13, F4 |
| B7 | **Avoidance versus absence** | ★ | B6 |
| B8 | **The ladder** — shrink → one idea → reroute → offer the skip | ★ | B7, A8, D2 |
| B9 | Caps, cooldowns, instant de-escalation on any reply | ✓ | B8 |
| B10 | **Pause** — declared time off | ★ | B6 |
| B11 | Outcome recorded for every intervention | ✓ | B8 |
| B12 | **Holdout** — 20% delayed, to prove the messages do anything | ★ | B8, B11 |
| B13 | Web push delivery, with retry and dead-subscription cleanup | ✓ | — |
| B14 | Email as the final rung | · | B13 |
| B15 | Recall checks — "explain it in three sentences" | · | A5 |

## C — Canon, the library

| ID | Feature | | Needs |
|---|---|---|---|
| C1 | Seed pages, hand-reviewed, shipped with the code | ✓ | — |
| C2 | AI-drafted pages generated offline, reviewed by hand before shipping | ★ | C1 |
| C3 | In-app review console | · | C2 |
| C4 | Page versioning in the database | · | C1 |
| C5 | Aliases — three per topic, including how someone types it at 11pm | ✓ | C1 |
| C6 | Sticking points — where people get stuck, specifically | ★ | C1 |
| C7 | Users disputing a prerequisite link | · | C1 |
| C8 | Generating Canon on demand for unseeded subjects | · | C2 |
| C9 | **Fixing the map from real behaviour** — shared stalls reveal missing links | ★ | C1, B7 |

## D — Prompts

| ID | Feature | | Needs |
|---|---|---|---|
| D1 | Prompt templates by intent, with a copy button | ✓ | C1 |
| D2 | **Compiled prompt** — page + this user's state, no AI call | ★ | D1, A5, C6 |
| D3 | Paste-back — read the AI's answer and learn from it | · | D2 |
| D4 | Rate prompts, promote the good ones | · | D2 |
| D5 | Decompose — the smallest useful entry into a topic | ★ | C6, D2 |

## E — The visible product

| ID | Feature | | Needs |
|---|---|---|---|
| E1 | Route screen | ✓ | A2 |
| E2 | Settings — time, quiet hours, timezone | ✓ | — |
| E3 | Manual log form | ✓ | — |
| E4 | History list | ✓ | F4 |
| E5 | Notes on a study session | · | E4 |
| E6 | Topic detail page | · | C1 |
| E7 | Progress page and charts | · | A5 |
| E8 | Continuity record — catches, longest gap survived, never streaks | ★ | B11 |
| E9 | Delete account and all data | ✓ | — |
| E10 | Explore mode — use it with no goal | · | — |
| E11 | Installable app, so iPhones can get notifications | · | B13 |
| E12 | Export your data | · | — |
| E13 | Search and filter topics | · | C1 |
| E14 | Share a route as a read-only link | · | A2 |
| E15 | Published routes — a teacher hands one to a class | · | E14 |
| E16 | Weekly summary | · | E4 |

## G — Later, and ambitious

| ID | Feature | | Needs |
|---|---|---|---|
| G1 | Personal fading rates, learnt from someone's own history | ★ | A6 |
| G2 | A policy that learns which message, at which hour, produces catches | ★ | B12 |
| G3 | **Predict a stall before it happens** | ★ | B7, C9 |
| G4 | Several goals at once, with priority | · | A2 |
| G5 | Import a syllabus or roadmap | · | C1 |
| G6 | Adaptive stall windows, fitted to each person's rhythm | · | B6 |
| G7 | Browser extension for logging from anywhere | · | F4 |
| G8 | Offline support with sync | · | — |

---

## The five things that make Thread unlike anything else

If a choice has to be defended in one line, these are the ones that defend themselves.

| | Why nothing else does it |
|---|---|
| **A3 — skip analysis** | Every learning product only ever adds. None tells you what does not matter, and unbounded is why people quit |
| **B7 — avoidance versus absence** | Habit trackers count days of silence, which cannot tell these apart, so they nudge everyone identically |
| **B8 — the shrinking ladder** | Everything else nudges harder. Ours ends by offering to let you quit the topic |
| **A8 — the reroute** | Only possible with a graph plus per-person mastery over it. Nobody else has both |
| **B10 — pause** | Because without it, exam fortnight is indistinguishable from giving up |
