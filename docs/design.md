# Thread — design

> You do not quit because the topic was too hard.
> You quit because you lost the thread and never found it again.

**Status:** designed. Nothing built yet.
**Version:** 5 — 10 September 2026. Two builders, four features, eight weeks.
**Built by:** Nitesh (Knowledge) and one teammate (Continuity). Two others are learning
frontend and get practice work — [`learners.md`](./learners.md).

This document is the truth. If the code disagrees with it, fix one of them the same day.

---

## 1. What Thread is

A website that keeps a self-taught learner from abandoning a subject.

It is **not** a tutor, a course, a note-taking app or a habit tracker. It does exactly
four things, and it deliberately does nothing else.

## 2. The problem

You start learning networking. It goes fine for a week. Then one topic does not make
sense. You read it twice, close the tab, and tell yourself you will come back tomorrow.

You do not. Four days pass, and now you have a second problem: you no longer remember
where you were. So you never restart.

What broke was not the explanation — there are thousands of good free ones. What broke
was **continuity**, the link between one study day and the next. Every other study app
tries to explain better. Nobody works on the link.

## 3. The one rule

**Thread never teaches. It never explains a concept.** When you are stuck it writes a
precise prompt and you take it to whichever AI you already use.

This is not a limitation. It is what keeps the product small enough for two people to
build, and it is why it costs almost nothing to run.

---

## 3b. Who Thread is for — and who it is not for

Written down because it is a real limit, and a limit you have chosen and stated is a
design decision rather than a gap someone else finds for you.

**Thread assumes a subject has genuine dependency structure** — that topic B stays hard
until topic A is solid, and that a person can be stuck on one thing while the rest waits.
Everything rests on that: the route, the skip analysis, the reroute.

**It fits** computer science, mathematics, physics, engineering theory, and anything else
learnt as a chain where one idea sits on another.

**It does not fit, and we say so rather than pretend:**

- **Memorisation-dominated subjects** — anatomy, pharmacology, statutes, vocabulary.
  Their topics are largely parallel, so "you can skip these four" is meaningless and
  possibly harmful, and the real enemy is forgetting rather than getting stuck.
- **Practice and portfolio subjects** — design, drawing, writing, an instrument. Progress
  is made by making things, and no dependency graph describes that.
- **Deadline-driven exam cramming.** We order a route by dependency, not by what is on
  the paper on the 15th. Someone three days from an exam should use something else.

A medical student and a law student are not our users. Saying so costs nothing and stops
us shipping a product that quietly fails half the people who try it.

**What we cover at launch:** computer networking, and React and frontend fundamentals.
Signup says this plainly, before anyone spends five minutes sorting topics for a subject
we do not have.

---

# The four features

This is the entire product. If something is not in service of one of these four, it does
not get built — not in a smaller form, not "quickly", not at all.

## Feature 1 — It makes a subject finite

You state a goal. Thread shows the topics between you and it, as a graph rather than a
list, and tells you **which ones you can skip**.

> 7 topics to learn. 4 you can skip.

**Why this is unique.** Every learning product only ever adds. Roadmaps, syllabi,
course lists, YouTube playlists — all of them grow, none of them ever tell you what does
not matter. But people do not quit because a subject is hard. They quit because it is
**unbounded**: there is always more, so there is no such thing as being done, so
stopping costs nothing. A number that goes down, and permission to drop four things, is
the difference between a subject you can finish and one you can only abandon.

It requires the graph. Without knowing that topic B genuinely needs topic A and only
*benefits* from topic C, you cannot say what is droppable.

**At signup you sort the topics: know it, shaky, never seen.** What you claim is held
loosely — it becomes a short *check* later, not work now. Without this, a learner three
weeks into networking is told to go and learn what an IP address is, and leaves.

## Feature 2 — One line a day

Every evening Kero asks one question:

> What did you get through today? Anything you bounced off?

You reply in plain English — *"tried congestion control, didn't get it at all"* — and
Thread lands it on the right topic and records how it felt.

**Why this exists.** It is the only intake, and the other three features are blind
without it. It is one line, in whatever words you use, with no form to fill and no timer
to remember to start. Everything that asks more than this gets abandoned in week two.

The word **bounced** matters: *I tried and got nowhere* is a different fact from *I did
not study*, and it is the single most valuable thing anyone ever tells us.

## Feature 3 — It knows the difference between busy and avoiding

You have not touched congestion control for four days. Thread checks one thing: **have
you been studying other topics in those four days?**

If nothing at all: you are busy. Life happened. It shrinks the plan and goes quiet.

If you have been studying around it: you are avoiding it. That is a completely different
situation, and it is the one worth acting on.

**Why this is unique.** Every habit tracker counts days of silence, and days of silence
cannot tell these apart — so they nudge everyone identically and become noise. Studying
*other things* while one topic sits untouched is a query, not a guess, and no other
learning tool asks it.

**We never say it out loud.** We work it out privately to choose a response. Being told
you are avoiding something lands as an accusation, and it is sometimes wrong.

**Pause exists because of this feature.** Exam fortnight must be sayable, or the system
classifies it as absence and nags someone who did nothing wrong. Two taps, and total
silence.

## Feature 4 — When you are stuck, the step gets smaller

Kero's answer to being ignored is never to get louder.

| | What it does |
|---|---|
| First | *"Fifteen minutes on this. Nothing more."* |
| Then | *"Forget the topic. Just one idea inside it — here is a prompt."* |
| Then | *"You may be stuck for a reason that is not this topic. You never really did retransmission timeouts. Try that instead — here is a prompt."* |
| Last | *"Drop it. Here is what that costs you."* |

**Why this is unique.** Two reasons.

The third step is only possible because of the graph: being stuck on a topic is often a
symptom of a prerequisite you skimmed weeks ago, and nothing else on the market can find
it because nothing else models topics as a graph with a per-person mastery estimate over
it.

And the fourth step — offering to quit the topic — is something no product built on
engagement would ever ship. A learner who drops one topic and keeps the subject has been
retained. A learner who quits the subject to avoid one topic has not.

---

## 4. What we are deliberately not building

The list matters as much as the features. Each of these was considered and cut, and we
do not reopen them.

**Cut because they are not one of the four:** progress charts, a continuity record,
streaks, points, badges, leaderboards, a topic-detail page, notes on sessions, a feed,
comments, sharing, an explore mode with no goal, a celebration screen for finishing a
goal, several goals at once, paste-back of the AI's answer, search.

**Cut because they cost more than they return in eight weeks:** in-app Canon generation
and a review console, page versioning in the database, email delivery, an installable
app and iPhone notifications, adaptive stall windows, recall checks, more than two
subjects.

**Cut permanently:** anything that explains a concept. Anything that lets one person see
another person's record. Anything that gives someone a reason to lie to us about what
they studied.

## 5. A week with Thread

**Day 1.** Ravi is three weeks into networking. He picks a goal, spends two minutes
sorting the topics into know / shaky / never seen, and gets *"7 topics to learn, 4 you
can skip"* — plus one thing to do and a prompt he can copy. Five minutes, and he already
has something usable.

**Day 1 evening.** *"read about sliding window for an hour, made sense."* Landed,
recorded, mastery up.

**Day 3.** *"tried congestion control, didn't get it at all."* Recorded as **bounced**.
Mastery does not move; the difficulty is written down.

**Days 4–6.** He answers every evening — DNS, HTTP. Congestion control untouched.

**Day 7.** He is studying around it, so this is avoidance, not absence. *"Fifteen
minutes on congestion control. Nothing more."* Ignored.

**Day 9.** *"Forget the topic. Just one idea: why a sender slows down when packets are
lost. Here is a prompt."* Ignored.

**Day 12.** Thread checks what congestion control depends on and finds he never really
did retransmission timeouts. *"You may be stuck for a reason that is not this topic. Try
this instead."*

**Day 13.** Forty minutes, and it makes sense. **That is a catch.** One learner did not
abandon networking.

**Day 20.** Exams. Pause until the 3rd. Silence, no stalls, no guilt on return.

Thread never explained congestion control, never mentioned a streak, and never told him
what kind of person it thought he was.

## 5b. Coming back

The most important moment in the product, and the easiest one to get wrong.

Someone stops for six weeks. Exams, a job, illness, or nothing in particular. Then one
evening they open Thread again.

What must **not** happen: a wall of decayed mastery, a list of everything they have
forgotten, a count of days missed, four stalls shouting at once, or a route that has
silently rearranged into something unrecognisable.

What happens instead:

- **One thing.** The single smallest useful step, chosen from whatever they were closest
  to.
- **No accounting.** We do not show them what decayed while they were away. The numbers
  changed; the screen does not lead with it.
- **No backlog.** Every open stall closes quietly as lapsed. Nothing that accumulated
  while they were gone is presented as owed.
- **No comment on the gap.** Not "welcome back!", not "it has been 43 days". Kero picks
  up as though the conversation paused mid-sentence — because for them, it did.

This is the whole thesis of the product in one screen. If Thread only ever does this one
thing well, it has done its job.

## 6. The two halves

Each owner takes database, API and screens for their half, so both are full-stack.

**Knowledge (Nitesh)** — Canon, the graph, mastery and fading, routes, skip analysis,
prompts, and the screens that show them. Features 1 and the third step of 4.

**Continuity (Teammate 2)** — the daily question, understanding the reply, stalls,
avoidance versus absence, the ladder, delivery, pause, and its screens. Features 2, 3
and the rest of 4.

**Where they meet.** Continuity writes rows into `study_events`. Knowledge owns
`topic_mastery` and nothing else writes to it. Continuity asks Knowledge what a sentence
means and what the weak prerequisite is; Knowledge never decides when to speak.

**Knowledge provides:** `resolveTopic(text)`, `routeFor(goalId)`, `skipAnalysis(goalId)`,
`nextStep(userId)`, `weakPrerequisite(userId, topicId)`, `applyStudyEvent(event)`,
`compilePrompt(userId, topicId, intent)`

**Continuity provides:** `recordStudyEvent(input)`, `detectStalls(now)`,
`pause(userId, until)`

Frozen at the end of week 1. Both sides return fake fixed data first, so neither waits.

## 7. Where AI is used, and where it is not

**Once, offline, by us.** We generate draft topic pages with an AI on our own machines,
review every one by hand, and commit the approved pages as seed data. No generation in
the product, no review console to build.

**Never on the live path.** Building a prompt is filling a template with facts already
in our database. Matching a sentence uses stored numbers.

**The teaching is the user's own AI**, outside our system.

So if every AI provider went down, Thread keeps working. Nothing on demo day can break
because of an outage, an expired key or an empty balance.

## 8. What we promise the user

**1. Your record is private.** No teacher, no admin, no classmate, ever, and not as a
"reporting feature" later. If a student thinks a teacher can see this, they will never
type *"I tried and got nowhere"* — they will type something that looks good, and Feature
3 goes blind. **A design constraint, not a privacy policy.**

**2. You can delete everything**, permanently, from inside the app.

**3. We never tell you what kind of person we think you are.**

**4. We never punish a gap.** Coming back must be the easiest thing in the product.

**5. Everything we tell you, we can explain** — including which four topics you can skip
and why.

## 9. Rules we never break

1. **No engine asks the computer what time it is.** Time is passed in, or testing four
   days of silence takes four days.
2. **Never throw away what a user typed.** If we cannot match it, say so honestly and
   keep the text. If answering does nothing, people stop answering.
3. **Kero never explains a concept.**
4. **The response to being ignored is a smaller step, never a louder message.**
5. **Skipping is relative to a goal** — "not required for this goal", never "not
   important".
6. **Only the next three topics are active, and only an active topic can stall.**
   Otherwise a week away produces twenty stalls at once.
7. **Nothing on the live path calls an AI.**
8. **Coming back is never harder than carrying on.** Someone returning after six weeks
   sees one thing to do, not a backlog. See §5b.

## 10. The database

**Canon**, shipped as seed data: `canon_topics`, `canon_pages` (scope — including where
the topic *ends* — plus sticking points), `canon_aliases`, `canon_embeddings`,
`canon_edges` (needed-before, marked **hard** or **soft**).

Two fields carry the product. Scope must say where a topic ends, or prompts wander.
Sticking points must be specific: "people find this hard" is useless, "people confuse
loss from congestion with loss from a bad link" is the whole page.

**The user's side:** `users`, `user_prefs`, `pauses`, `goals`, `routes` +
`route_waypoints` (each **learn**, **check** or **skippable**, with a state),
`study_events`, `topic_mastery`, `stalls`, `interventions`, `checkins`,
`push_subscriptions`.

`study_events` is append-only and is the truth. `topic_mastery` is a **calculation** —
delete it, replay every event, get identical numbers. Our first mastery formula will be
wrong, and this is what lets us replace it without losing history. **Store what
happened, calculate the rest.**

**Where the real database work is,** for the viva: walking the graph with a recursive
query; ordering a route so nothing precedes what it depends on; rebuilding mastery from
a whole event log in one transaction; matching meaning with a vector index; making the
stall job safe to run twice using constraints rather than hope.

## 11. How we know it works

**The one number: catches** — stalls where the person returned within 14 days. After 21
silent days a stall closes as **lapsed**.

A catch does not prove our message caused it; they might have come back anyway. So for
**20% of stalls, chosen at random when the stall opens**, we delay the whole ladder by
48 hours and compare on one fixed measure: studied within 14 days of the stall opening.

If both groups match, our messages are decorative and we say so in the report. That is a
real result, it costs almost nothing, and it is the strongest thing we will have to
show.

## 12. Who builds what

| Owner | Half | What they can honestly claim |
|---|---|---|
| **Nitesh** | Knowledge | A learning engine modelling topics as a dependency graph, matching free text to topics by meaning, tracking how knowledge fades, and computing what a learner can safely skip |
| **Teammate 2** | Continuity | A system that detects when a learner stops, distinguishes avoidance from absence, and chooses and measures the response |

Two teammates are learning frontend from scratch. They own nothing on the critical path
and get real, non-blocking practice work — [`learners.md`](./learners.md), run by
Nitesh.

## 13. How we work

1. Each owner decides inside their half; anything crossing the line goes in this file.
2. No decision stays open more than 24 hours.
3. Interfaces frozen end of week 1; build against fakes.
4. Twenty minutes a week, each explains their half to the other. Grading is individual.
5. **From week 5 we both use it for our own studying.** Muting Kero is a bug report
   about the product, not a failing of yours — write down what it did.

## 14. Eight weeks

| Week | Knowledge | Continuity |
|---|---|---|
| 1 | Together: tables, migrations, login, deploy, fakes. **Interfaces frozen.** Canon pages started. | |
| 2 | Route computation on seed data | Check-in scheduler and conversation, clock injected |
| 3 | Mastery from events, and the rebuild proof | **The simulator**, then stall detection |
| 4 | Text matching, with candidates and honest off-map | Notifications, in-app card, pause |
| 5 | Join it up. The spine works once, end to end. **Both start using it daily.** | |
| 6 | Skip analysis, and why a topic is on the route | Avoidance versus absence |
| 7 | Fading, and the weak-prerequisite lookup | The ladder, caps, outcomes, the holdout |
| 8 | Stop building. Fix, document, rehearse the demo. | |

**Build the simulator in week 3.** Otherwise every test of Feature 3 takes real days.
It is also half the demo, because nobody sees six weeks of continuity in a fifteen
minute presentation.

**Cut in this order if behind:** the holdout, the fourth ladder step, the *check*
waypoints from onboarding, off-map handling.

**Never cut the spine:** ask → understand → update mastery → decide next → notice the
stall → respond → prompt.

**Demo from a real account** with weeks of genuine history. A live signup shows an empty
product.

**Lead the demo with the catch, not the route.** The route is the prettier screen, but the
catch — a stall detected, the step shrinking, the reroute landing, the person coming back
— is the thing nobody else can show. It is also Continuity's half, which keeps the demo
honest about who built what.

## 15. Risks

| Risk | What we do |
|---|---|
| The AI writes wrong prerequisites | Every page reviewed by hand before it ships. Reject any link you cannot justify in one sentence |
| Text matching is unreliable | Offer choices when unsure, never guess silently, keep everything typed |
| The mastery formula is wrong | It is calculated over an event log; change it and recompute |
| Two people is not many | Scope is already cut to four features. Cut further before extending the timeline |
| One of us gets busy | Each half runs standalone against fakes |
| Feature creep | §4 exists so we do not reopen a settled cut |
| We stop using it because it is annoying | The most valuable bug report of the semester |
| Someone signs up for a subject we do not have | Signup says what we cover before they invest any time |
| Replies typed in Hinglish or shorthand do not match | Aliases include how people actually type, and the 50-sentence test set is written the same way |
| Somebody is absent for weeks and simply vanishes | §5b. One thing on return, no backlog, no accounting |
| "Is it fair to hold messages back from real people?" | The holdout delays by 48 hours; it never withholds. The alternative is shipping a feature we cannot evaluate at all |

## 16. Decisions, and why

| Decision | Why |
|---|---|
| Four features, nothing else | Two people, eight weeks. A small product that works beats a large one that half-works |
| Thread never explains anything | Keeps it small, keeps it cheap, and is the only thing that makes us different |
| Nothing on the live path calls an AI | No outage or dead key can break the running product |
| Canon ships as seed data | Removes generation, review console and versioning from a short project |
| Topics form a graph, not a list | Features 1 and the third step of 4 are impossible without it |
| Events append-only, mastery calculated | Our first formula will be wrong; we want to fix it without losing history |
| Time is always passed in | Otherwise Feature 3 is untestable |
| What you say you know becomes a check, not work | Otherwise a learner three weeks in is told to start from zero, and leaves |
| Only three topics active | Otherwise one week away produces twenty stalls |
| Avoidance is never said out loud | It is sometimes wrong, and it lands as an accusation |
| Nobody can supervise anybody | Supervision turns an honest record into a performance |
| We hold back some messages on purpose | Otherwise we never learn whether any of this works |
| The two subjects are networking and React | So all four of us — builders and learners — can use it on our own real studying from week 5. A product nobody on the team can use never gets dogfooded |
| We state who Thread does not suit | A stated limit is a decision. An unstated one is a product that quietly fails half its users |
| v1 mastery measures exposure, not competence | Honest, and cheap to say. Reading about a topic is not knowing it, so reading alone is capped — see `knowledge.md` |
| Coming back is a designed screen, not a side effect | It is the moment the entire product exists for |

## 17. Change log

| Date | Change |
|---|---|
| 2026-09-08 | First version, a full review, then a consistency pass across five documents. |
| 2026-09-10 | Rewritten for two builders; four parts merged into two full-stack halves. |
| 2026-09-10 | **Version 6 — reviewed from outside computer science.** Added §3b, who Thread is for and who it is not for, after testing the design against medical, law, design and exam-driven students: it assumes dependency structure, and now says so instead of quietly failing people it does not suit. Added §5b, coming back after a long absence — the product's most important moment, which no document covered. Changed the seed subjects to **networking and React**, so the two learners can dogfood their own studying and `learners.md` stops contradicting the spec. Stated that v1 mastery measures exposure rather than competence, and capped reading-only mastery. Added code-mixed and shorthand input to Canon aliases and the test set, a signup gate for subjects we do not cover, and a one-line answer on the ethics of the holdout. |
| 2026-09-10 | **Version 5 — cut to four features.** The product is now: make a subject finite, one line a day, tell avoiding from busy, and shrink the step when stuck. Everything else moved into §4, which is now a permanent list of what we are not building. Removed the topic page, notes, history as a feature, progress, the continuity record, finishing a goal, adaptive frequency and explore mode. Removed the beginner glossary — both builders know the stack. |
