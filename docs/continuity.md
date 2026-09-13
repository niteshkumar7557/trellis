# Continuity — Teammate 2

**Owns:** Feature 2 (one line a day), Feature 3 (busy versus avoiding) and Feature 4
(the step gets smaller). The daily question, the conversation, stalls, the ladder,
delivery, pause, and the screens for them.

Read `design.md` first. Numbers live here; change them here, with a date and a reason.

---

## What you answer

| Question | For |
|---|---|
| `recordStudyEvent(input)` | Feature 2 — turn a reply into a study event |
| `detectStalls(now)` | Feature 3 |
| `pause(userId, until)` | Feature 3 |

You ask Knowledge what a sentence means, and what the weak prerequisite is. You never
compute either.

## Why this half is the hard one

Every other part of Thread is passive and waits for someone to open the site. But the
person we built this for **has stopped opening the site** — that is the whole problem.
So this is the product's only chance to matter, and also the part most likely to make
people hate it. Something that speaks to you uninvited is either a friend or a nuisance,
with nothing in between.

## The ideas

**The question.** Its wording is engineering, not copy. *"Did you study?"* returns a
boolean. *"What did you get through today? Anything you bounced off?"* returns the most
valuable row in the database.

It goes out as a notification **and** as a card on the home screen, because a real share
of people refuse notification permission and Thread must still work for them.

**Absence.** Nothing studied at all. Life happened. Shrink the plan, go quiet.

**Going quiet has to end somewhere.** After **21 days** of total absence, send exactly one
short message — no guilt, no summary of what they have missed — and then stop entirely.
Someone who does not want this in their life must be able to stop hearing from us by doing
nothing at all: no unsubscribing, no decision, no confrontation.

**Avoidance.** They studied *other* topics while one sat untouched, and that topic was
rated hard or bounced. This is the one worth acting on, and it is a query, not a guess.

**The ladder.** Escalation means making the task smaller, never the message louder.

**Coming back.** When someone returns after a long absence, `design.md` §5b binds this
half: **one thing, no backlog, no accounting, no comment on the gap.** Every open stall
closes as lapsed before they see the screen; Kero does not say "welcome back" and never
mentions how long it has been. Getting this wrong undoes the entire product in one screen.

**Catch.** They returned within 14 days of the stall opening. After 21 silent days it
closes as **lapsed**. Define it once; never measure it two ways or every number in the
report becomes arguable.

## The laws

1. **Never say the classification out loud.** Act on it, never announce it.
2. **Never punish a gap.** No guilt, no "you missed four days".
3. **Escalate only on silence; de-escalate on any sign of life** — a reply, a study
   event, even opening the app.
4. **Pause is absolute.** No questions, no new stalls, and existing stall clocks do not
   run. Returning is not a relapse.
5. **Respect the caps whatever happens.** Someone with five stalled topics is already
   struggling; five messages would finish them off.
6. **Every intervention points at the stall that caused it.** (The daily question is not
   an intervention — it is on a schedule and has no stall behind it.)
7. **Record the outcome of every intervention.** One whose result we did not record was
   wasted.
8. **Time is a parameter.** Nothing here reads the clock, or testing four days of silence
   takes four days.
9. **Coming back is never harder than carrying on.** No backlog, no accounting, no
   greeting that draws attention to the gap.

## The numbers

**The question.** Default 21:00 local; quiet hours 22:00–08:00. Wait 90 minutes for a
reply before marking it unanswered. At most one clarifying question, expiring after 60
minutes. Skip it entirely if they already logged something today.

**Stalls.** Only on **active** topics — the next three on the route, decided by
Knowledge. Fixed window of **4 days** with no event. (Adapting the window to each
person's rhythm is a good idea and it is post-v1; it needs 30 days of history nobody has
yet.)

**Avoidance requires all of:** 3 or more study events on *other* topics inside the
window, **and** either the last event on this topic was `hard` or `bounced`, or it was
opened 3+ times with under 10 minutes logged in total. No events at all → **absence**.
Neither → **unknown**, and do nothing.

**The ladder.**

| Step | When | What Kero does |
|---|---|---|
| 1 | Stall opens | Fifteen minutes, nothing more |
| 2 | 48h later, no response | One small idea inside the topic, with a prompt |
| 3 | 72h after that | Name the weak prerequisite, with a prompt |
| 4 | 96h after that | Offer the skip, and say plainly what it costs |

Then silence. The stall stays open but quiet for 21 days, then lapses.

**Caps.** One message per topic per 48 hours. **Two messages per person per week across
all topics.** Zero during a pause.

**The holdout.** 20% of stalls, chosen at random the moment the stall opens and never
re-rolled, have the **whole ladder** delayed 48 hours — not just step 1, or the groups
stop being comparable after the first message. Compare on one fixed measure: studied
within 14 days of the stall opening.

## The simulator — build it in week 3

Invented learners — diligent, avoider, busy, sporadic — whose six weeks replay in seconds
against an injected clock. It writes study events already attached to topics, so it does
not wait on Knowledge's text matching.

Without it, every test of Feature 3 takes real days, and you will ship it untested. With
it you test a hundred learners in a second. It is also half the demo, because nobody sees
six weeks of continuity in a fifteen-minute presentation.

## Your eight weeks

| Week | You |
|---|---|
| 1 | Together: tables, migrations, login, deploy, fakes. Interfaces frozen. Then the check-in scheduler against fake users, clock injected. |
| 2 | Conversation state: asked, answered, clarify, timed out. Real check-ins end to end on Knowledge's fake matcher. |
| 3 | **The simulator.** Then stall detection with the fixed window. |
| 4 | Notifications with retry and dead-subscription cleanup, the in-app card, and pause. |
| 5 | Join it up. Start using it daily, and write down everything annoying. |
| 6 | **Avoidance versus absence.** |
| 7 | The full ladder, caps, de-escalation, outcomes recorded, and the holdout. |
| 8 | Stop. Tune the wording. Write up what the holdout showed. |

## How you know it is right

- A stall never opens on a topic that is not active. Test with a twenty-topic route.
- Two weeks of nothing gets **absence** handling, never the ladder.
- Four other topics studied while one is ignored gets **avoidance**.
- A user with five stalls gets at most two messages in a week. Test it explicitly.
- Any reply drops the ladder to zero. Test from every step.
- Across a pause boundary: nothing sent, no clock advanced.
- A simulated learner absent six weeks gets exactly one message at day 21, then silence —
  and on return sees one thing, with every stale stall already lapsed.
- Running the stall job twice produces one stall, not two.
- No test takes more than a second. If one does, the clock is not injected somewhere.

## Traps

- **Nudging harder when ignored.** The natural instinct, wrong every time.
- **Letting the classification leak into the wording.** Read every message aloud and ask
  whether it sounds like an accusation.
- **Jobs running twice.** They will. Make duplicates impossible in the database.
- **Deciding the holdout later.** It is assigned when the stall opens or the comparison
  means nothing.
- **Treating a lapse as shameful.** It is data. Count it.

## Viva questions

- How do you tell avoidance from being busy, and how often are you wrong?
- Why does escalation make the task smaller instead of the message louder?
- Why does the user never see the classification?
- How do you know your messages help at all?
- What happens if the job runs twice?
- What happens to someone who refused notifications?
- What does someone see when they come back after six weeks, and why not a summary?
- Is it fair to hold messages back from real people in the holdout?
