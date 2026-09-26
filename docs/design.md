# Trellis — design

> You do not quit because the topic was too hard.
> You quit because you lost the Trellis and never found it again.

**Version:** 3

This document is the truth. If the code disagrees with it, fix one of them the same day.

---

## 1. What Trellis is

A website that keeps a self-taught learner from abandoning a subject.

It is **not** a tutor, a course, a note-taking app or a habit tracker. It does exactly
four things, and it deliberately does nothing else for now.

## 2. The problem

You start learning networking. It goes fine for a week. Then one topic does not make
sense. You read it twice, close the tab, and tell yourself you will come back tomorrow.

You do not. Four days pass, and now you have a second problem: you no longer remember
where you were. So you never restart.

What broke was not the explanation — there are thousands of good free ones. What broke
was **continuity**, the link between one study day and the next. Every other study app
tries to explain better. Nobody works on the link.

## 3. The one rule

**Kero never teaches. It never explains a concept.** When you are stuck it writes a
precise prompt and you take it to whichever AI you already use.

This is not a limitation. It's just not our purpose.

---

## 4. Who Trellis is for — and who it is not for

**Kero assumes a subject has genuine dependency structure** — that topic B stays hard
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

**What we cover at launch:** computer networking, Reactjs, Backend(Express) and DBMS(Postgresql).
Signup says this plainly, before anyone spends five minutes sorting topics for a subject
we do not have.

---

# The four features

## Feature 1 — It makes a subject finite

You state a goal. Trellis shows the topics between you and it, as a graph rather than a
list, and tells you **which ones you can skip**.

> 7 topics to learn. 4 you can skip.

**Why this is unique.** Every learning product only ever adds. Roadmaps, syllabi,
course lists, YouTube playlists — all of them grow, none of them ever tell you what does
not matter while learning basics. But people do not quit because a subject is hard. They quit because it is
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
Kero lands it on the right topic and records how it felt.

**Why this exists.** It is the only intake, and the other three features are blind
without it. It is one line, in whatever words you use, with no form to fill and no timer
to remember to start. Everything that asks more than this gets abandoned in week two.

The word **bounced** matters: *I tried and got nowhere* is a different fact from *I did
not study*, and it is the single most valuable thing anyone ever tells us.

## Feature 3 — It knows the difference between busy and avoiding

You have not touched congestion control for four days. Kero checks one thing: **have
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

## 5. A week with Kero

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

**Day 12.** Trellis checks what congestion control depends on and finds he never really
did retransmission timeouts. *"You may be stuck for a reason that is not this topic. Try
this instead."*

**Day 13.** Forty minutes, and it makes sense. **That is a catch.** One learner did not
abandon networking.

**Day 20.** Exams. Pause until the 3rd. Silence, no stalls, no guilt on return.

Trellis never explained congestion control, never mentioned a streak, and never told him
what kind of person it thought he was.

## 6. Coming back

The most important moment in the product, and the easiest one to get wrong.

Someone stops for six weeks. Exams, a job, illness, or nothing in particular. Then one
evening they open Trellis again.

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

This is the whole thesis of the product in one screen. If Kero only ever does these
things well, it has done it's job.


## 7. Where AI is used, and where it is not

**One time by us.** We generate draft topic pages with an AI on our own machines,
review every one by hand, and commit the approved pages as seed data.

**The teaching is the user's own AI**, outside our system.

**More In Flows.**

## 8. Flows

**To be Planned.**

## 9. What we promise the user

**1. Your record is private.** No teacher, no admin, no classmate, ever, and not as a
"reporting feature" later. If a student thinks a teacher can see this, they will never
type *"I tried and got nowhere"* — they will type something that looks good, and Feature
3 goes blind. **A design constraint, not a privacy policy.**

**2. You can delete everything**, permanently, from inside the app.

**3. We never tell you what kind of person we think you are.**

**4. We never punish a gap.** Coming back must be the easiest thing in the product.

**5. Everything we tell you, we can explain** — including which four topics you can skip
and why.

## 10. Rules we never break

1. **Kero never explains a concept.**
2. **The response to being ignored is a smaller step, never a louder message.**
3. **Skipping is relative to a goal** — "not required for this goal", never "not
   important".
4. **Coming back is never harder than carrying on.** Someone returning after six weeks
   sees one thing to do, not a backlog.
