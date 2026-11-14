// The helper: the chat in the map's side panel (design.md §7).
//
// The rules, whoever reads the message:
//   - it never saves anything itself: updates come back as a proposal the student confirms
//   - it asks one question about how it went, then proposes
//   - it never explains a topic; it hands back a prompt
// Reading a message (which topic, how it went) is separate from replying to it; see
// "the Reading" below. The backend reads typed messages with GLM 5 when it can (M5) and
// with readByRules() otherwise; the replies always come from replyFor().

import { bigOf, kids, subjectById, topicById } from "./data";
import {
  claimSource,
  importanceOf,
  isFooting,
  nextTopic,
  pastUnlocks,
  requiredFor,
  revealed,
  sortByRoute,
  statusOf,
  suspectsFor,
  type Suspect,
} from "./graph";
import { declines, findTopic, readKind, readOutcome, reasonIn, tidy } from "./parse";
import type { ChatMessage, CheckIn, Claim, Experience, ExperienceKind, Goal, Outcome, Proposal, Status, SubjectId } from "./types";

export interface HelperContext {
  subjectId: SubjectId;
  goal: Goal | null;
  statuses: Map<string, Status>;
  claims: Claim[];
  checkIns: CheckIn[];
  experiences: Experience[];
  /** This subject's conversation, oldest first. */
  messages: ChatMessage[];
  /** The topic open in the side panel, if any: "finished it" means this one. */
  selected: string | null;
  opened: string[];
}

/** What the helper replies: text plus cards, and maybe a question whose answer it waits for. */
export type Reply = Pick<ChatMessage, "text" | "cards" | "asks">;

export type Input =
  | { kind: "say"; text: string }
  /** A tap: a choice card, or the topic panel's Got it / Partly / Stuck. */
  | { kind: "pick"; outcome: Outcome; topicIds: string[] };

const OUTCOME_WORD: Record<Outcome, string> = { got: "done", partly: "partly done", stuck: "stuck" };

const QUESTION: Record<"stuck" | "partly" | "got" | "unstuck", { text: string; kind: ExperienceKind }> = {
  stuck: { text: "What's confusing about it?", kind: "hard" },
  partly: { text: "What's still unclear?", kind: "hard" },
  got: { text: "What felt easy, and was anything hard?", kind: "easy" },
  unstuck: { text: "What made it click?", kind: "clicked" },
};

// ---------------------------------------------------------------- the Reading
//
// Answering a message is two steps, split so either reader can do the first one:
//
//   1. READ it into a Reading: which path, which topics, how it went, what they said.
//      readByRules() does it with keywords. The backend's model reader (M5) fills the
//      same shape from a GLM 5 call, and falls back to readByRules() when that fails.
//   2. REPLY with replyFor(reading, ctx). Everything that decides what the student is
//      told (next topic, skip or not, suspects) happens here, from shared/graph.ts.
//
// Because every reader ends at replyFor(), the helper can't behave differently "because
// the AI was down": only the reading can differ, never the rules. respond() is the two
// steps together, for the frontend's demo mode.

export type ReadingPath = "report" | "answer" | "next" | "skip" | "why_stuck" | "explain" | "app_help" | "other";

/** What a message says, whoever read it. replyFor() decides everything from this. */
export interface Reading {
  /**
   * report: says how a topic went ("finished State").    answer: replies to the question
   * the helper just asked.    next / skip / why_stuck: asks about the map.    explain:
   * wants a topic explained (gets a prompt).    app_help: asks how Trellis works.
   * other: anything else, possibly naming a topic.
   */
  path: ReadingPath;
  /** Subtopics of this subject the message is about. Empty when it names none. */
  topicIds: string[];
  /** A big topic named without a subtopic ("finished lists"): the reply asks which one. */
  bigId: string | null;
  outcome: Outcome | null;
  /** What they said about how it went. Attached to the one topic, if there is one. */
  experiences: { kind: ExperienceKind; text: string; line: string }[];
  /** For app_help: which entry of the guide answers it. */
  help: HelpTopic | null;
  /** The student's words, kept as the check-in's text. */
  said: string;
}

const EXPLAIN = /^(please )?(explain|teach me|tell me about|what('?s| is| are)|how (does|do|to|can)|why (does|do|is))\b|\bexplain\b/i;
const NEXT = /(what('?s| is)? next|now what|what (should|do|can) i (do|study|learn|start)|where (do|should) i (start|go)|what to (do|study)|next (step|topic))/i;
const SKIP = /\b(skip|skippable|ignore|leave out|need to (learn|know|do))\b/i;
const WHY_STUCK = /(why (am i|i'?m) stuck|what'?s (wrong|holding me back|in the way)|why can'?t i (get|understand))/i;

const reading = (path: ReadingPath, said: string, over: Partial<Reading> = {}): Reading => ({
  path,
  topicIds: [],
  bigId: null,
  outcome: null,
  experiences: [],
  help: null,
  said,
  ...over,
});

/** The keyword reader: the fallback when no model is available, and the demo's only reader. */
export function readByRules(rawText: string, ctx: HelperContext): Reading {
  const text = rawText.trim();
  const pending = pendingQuestion(ctx);
  const found = findTopic(text, ctx.subjectId);
  const outcome = readOutcome(text);
  const isQuestion = /\?\s*$/.test(text) || NEXT.test(text) || SKIP.test(text) || WHY_STUCK.test(text) || EXPLAIN.test(text);
  const named = found.topicId ? [found.topicId] : [];

  // The answer to the question just asked, unless the student moved on to something new.
  if (pending && !isQuestion && !(found.topicId && outcome && found.topicId !== pending.pending.updates[0]?.topicId)) {
    return reading("answer", text, { experiences: experiencesInAnswer(text, pending.kind) });
  }

  if (EXPLAIN.test(text) && !NEXT.test(text)) {
    const faq = helpTopicIn(text);
    if (faq && !found.topicId) return reading("app_help", text, { help: faq });
    return reading("explain", text, { topicIds: named, bigId: found.bigId });
  }

  const faq = helpTopicIn(text);
  if (faq) return reading("app_help", text, { help: faq });

  if (WHY_STUCK.test(text)) return reading("why_stuck", text);
  if (SKIP.test(text)) return reading("skip", text, { topicIds: named, bigId: found.bigId });

  if (outcome) {
    // A big topic's name without a subtopic's ("finished lists") means "some of these":
    // drop any subtopic matched only by a keyword, so the reply asks which one.
    const vague = found.bigId !== null && !found.named;
    const why = reasonIn(text);
    return reading("report", text, {
      topicIds: vague ? [] : named,
      bigId: found.bigId,
      outcome,
      experiences: why ? [{ kind: readKind(why, QUESTION[outcome].kind), text: why, line: tidy(why) }] : [],
    });
  }

  if (NEXT.test(text)) return reading("next", text);
  return reading("other", text, { topicIds: named });
}

/** What an answer to "what's confusing?" / "what felt easy?" says. Empty if they declined. */
function experiencesInAnswer(text: string, asked: ExperienceKind): Reading["experiences"] {
  if (declines(text)) return [];
  // "What felt easy, and was anything hard?" often gets both: "X was easy, but Y…".
  const parts = asked === "easy" ? text.split(/,?\s+but\s+/i) : [text];
  if (parts.length === 2 && parts.every((x) => x.trim().split(/\s+/).length >= 2)) {
    return [
      { kind: "easy", text: parts[0].trim(), line: tidy(parts[0]) },
      { kind: "hard", text: parts[1].trim(), line: tidy(parts[1]) },
    ];
  }
  return [{ kind: readKind(text, asked), text, line: tidy(text) }];
}

/** Turns a Reading into the reply. The same function whichever reader read the message. */
export function replyFor(r: Reading, ctx: HelperContext): Reply {
  switch (r.path) {
    case "answer": {
      const pending = pendingQuestion(ctx);
      // The model can say "answer" when nothing was asked; treat it as a plain message.
      if (!pending) return replyFor({ ...r, path: "other" }, ctx);
      return answer(r.experiences, pending);
    }
    case "explain": {
      const id = r.topicIds[0] ?? (r.bigId ? null : contextTopic(ctx));
      if (id) {
        return {
          text: `I don't explain topics myself: your own AI is better at that. Here's a prompt for ${topicById.get(id)!.name}, built from where you are.`,
          cards: [{ type: "prompt", topicId: id }],
        };
      }
      return { text: "Which topic? Tell me its name and I'll give you a prompt for your own AI." };
    }
    case "app_help":
      return { text: r.help ? GUIDE[r.help].say : CAPABILITIES };
    case "why_stuck":
      return whyStuck(ctx);
    case "skip": {
      const id = r.topicIds[0] ?? r.bigId;
      if (!id) return { text: "Which topic are you thinking of skipping?" };
      return canSkip(id, ctx);
    }
    case "report": {
      // A model may report without saying how it went; without an outcome there is
      // nothing to propose, so answer it like any other message.
      if (!r.outcome) return replyFor({ ...r, path: "other" }, ctx);
      if (r.topicIds.length === 0 && r.bigId) return chooseInside(r.bigId, r.outcome, ctx);
      const ids = r.topicIds.length ? r.topicIds : [contextTopic(ctx)].filter((id): id is string => id !== null);
      if (!ids.length) return chooseAny(r.outcome, ctx);
      return proposeOrAsk(r.outcome, ids, r.experiences, r.said, ctx);
    }
    case "next":
      return whatNext(ctx);
    case "other": {
      const id = r.topicIds[0];
      if (id) {
        return {
          text: `Did you study ${topicById.get(id)!.name}? Tell me how it went, or I can give you a prompt for it.`,
          cards: [
            {
              type: "choose",
              outcome: "got",
              options: [
                { label: "Got it", topicIds: [id], outcome: "got" },
                { label: "Partly", topicIds: [id], outcome: "partly" },
                { label: "Stuck", topicIds: [id], outcome: "stuck" },
              ],
            },
            { type: "prompt", topicId: id },
          ],
        };
      }
      return { text: CAPABILITIES, cards: [{ type: "suggest", options: suggestions(ctx) }] };
    }
  }
}

const CAPABILITIES =
  "I can update a topic on your map, give you a prompt for your own AI, tell you what's next, or say whether you can skip something.";

/**
 * Reads and replies in one go: the rule-based helper. The frontend's demo mode uses this.
 * A tap needs no reading: our own code knows what was tapped.
 */
export function respond(input: Input, ctx: HelperContext): Reply {
  if (input.kind === "pick") return replyFor(readTap(input.outcome, input.topicIds), ctx);
  return replyFor(readByRules(input.text, ctx), ctx);
}

/** A tap on Got it / Partly / Stuck, as a Reading. No words, so no experiences. */
export function readTap(outcome: Outcome, topicIds: string[]): Reading {
  return reading("report", "", { topicIds, outcome });
}

// ---------------------------------------------------------------- proposing

/** Ask the one question first; skip it when the message already says why, or for several topics. */
function proposeOrAsk(outcome: Outcome, topicIds: string[], said: Reading["experiences"], words: string, ctx: HelperContext): Reply {
  const ids = topicIds.filter((id) => topicById.get(id)?.parentId);
  const pending: Proposal = { updates: ids.map((topicId) => ({ topicId, outcome })), experiences: [], said: words };
  const name = ids.length === 1 ? topicById.get(ids[0])!.name : `${ids.length} topics`;

  if (ids.length !== 1) return confirm(pending, `I'll mark ${name} as ${OUTCOME_WORD[outcome]}.`);

  const q = questionFor(outcome, ids[0], ctx);
  if (said.length) {
    // Back from stuck to done: whatever they said is what made it click.
    for (const e of said) pending.experiences.push({ topicId: ids[0], ...e, kind: q.kind === "clicked" ? "clicked" : e.kind });
    return confirm(pending, "Here's what I'll save. Change anything that's wrong.");
  }

  const opener =
    outcome === "stuck" ? `Sounds like you're stuck on ${name}.` : outcome === "partly" ? `Sounds like ${name} is partway there.` : `Nice, ${name} done.`;
  return { text: `${opener} ${q.text}`, asks: { kind: q.kind, pending } };
}

function questionFor(outcome: Outcome, topicId: string, ctx: HelperContext) {
  if (outcome === "got" && statusOf(ctx.statuses, topicId) === "stuck") return QUESTION.unstuck;
  return QUESTION[outcome];
}

function answer(experiences: Reading["experiences"], asked: NonNullable<ChatMessage["asks"]>): Reply {
  const proposal: Proposal = { ...asked.pending, experiences: [...asked.pending.experiences] };
  const topicId = proposal.updates[0]?.topicId;
  if (topicId) for (const e of experiences) proposal.experiences.push({ topicId, ...e });
  // No experiences means they declined to say ("no", "skip"): that's fine.
  return confirm(proposal, experiences.length ? "Here's what I'll save. Change anything that's wrong." : "No problem. Here's what I'll save.");
}

/** How each outcome reads on a button and in a check-in made by a tap. */
export const OUTCOME_LABEL = { got: "Got it", partly: "Partly", stuck: "Stuck" } as const;

/**
 * The text a saved check-in keeps: the student's own words, or for a tap (no words) a
 * label such as "Stuck: FlatList". Shared so the demo store and the API save the same.
 */
export function checkInText(proposal: Proposal, update: Proposal["updates"][number]): string {
  return proposal.said || `${OUTCOME_LABEL[update.outcome]}: ${topicById.get(update.topicId)?.name ?? ""}`;
}

function confirm(proposal: Proposal, text: string): Reply {
  return { text, cards: [{ type: "confirm", proposal, state: "open" }] };
}

/** "Finished lists": which ones? */
function chooseInside(bigId: string, outcome: Outcome, ctx: HelperContext): Reply {
  const big = topicById.get(bigId)!;
  const open = sortByRoute(kids(bigId)).filter((t) => !isFooting(statusOf(ctx.statuses, t.id)));
  const core = open.filter((t) => !t.optional);
  const options = open.slice(0, 5).map((t) => ({ label: t.name, topicIds: [t.id] }));
  if (core.length > 1) options.push({ label: `All core topics in ${big.name}`, topicIds: core.map((t) => t.id) });
  if (!options.length) return { text: `Everything in ${big.name} is already done or known.` };
  return {
    text: `${big.name} has ${kids(bigId).length} topics inside. Which did you mean?`,
    cards: [{ type: "choose", outcome, options }],
  };
}

function chooseAny(outcome: Outcome, ctx: HelperContext): Reply {
  const next = ctx.goal ? nextTopic(ctx.goal, ctx.statuses) : null;
  const active = ctx.checkIns
    .filter((c) => topicById.get(c.topicId)?.subjectId === ctx.subjectId)
    .sort((a, b) => b.at.localeCompare(a.at))
    .map((c) => c.topicId);
  const ids = [...new Set([...(next ? [next.id] : []), ...active])].slice(0, 4);
  return {
    text: "Which topic was that?",
    cards: ids.length ? [{ type: "choose", outcome, options: ids.map((id) => ({ label: topicById.get(id)!.name, topicIds: [id] })) }] : [],
  };
}

// ---------------------------------------------------------------- after saving

/** What to do next, once the student has saved a proposal. `before`: big topics open before saving. */
export function afterSave(proposal: Proposal, ctx: HelperContext, before: Set<string>): Reply {
  const update = proposal.updates.length === 1 ? proposal.updates[0] : null;
  const next = ctx.goal ? nextTopic(ctx.goal, ctx.statuses) : null;
  const nowOpen = revealed(ctx.subjectId, ctx.statuses, ctx.checkIns, next?.id ?? null, ctx.opened, ctx.experiences);
  const opened = [...nowOpen].filter((id) => !before.has(id)).map((id) => topicById.get(id)!);
  const grew = opened.length
    ? ` That opened ${opened.map((t) => t.name).join(" and ")} on your map: ${opened.reduce((n, t) => n + kids(t.id).length, 0)} new topics.`
    : "";

  if (update?.outcome === "stuck") {
    const s = suspectsFor(update.topicId, ctx.statuses, ctx.checkIns, ctx.experiences)[0];
    const topic = topicById.get(update.topicId)!;
    const keep = ctx.goal ? importanceOf(topic.id, ctx.goal, requiredFor(ctx.goal)) : null;
    const unlock = pastUnlocks(ctx.checkIns, ctx.experiences).at(-1);
    if (s) {
      return {
        text: `Saved. You may be stuck because of ${s.topic.name}: ${topic.name} needs it, and ${weakBecause(s, ctx.claims)}${
          keep ? ` ${keep.reason}` : ""
        }${unlock ? ` Last time, going back to ${unlock.via.name} got you through ${unlock.stuckOn.name}.` : ""} Here's a prompt that starts there.${grew}`,
        cards: [{ type: "prompt", topicId: s.topic.id }],
      };
    }
    return {
      text: `Saved.${keep ? ` ${keep.reason}` : ""} Everything ${topic.name} needs looks solid, so here's a prompt for it that tries a different way in.${grew}`,
      cards: [{ type: "prompt", topicId: topic.id }],
    };
  }

  if (update?.outcome === "partly") {
    return {
      text: `Saved. Here's a prompt that picks up where you stopped on ${topicById.get(update.topicId)!.name}.${grew}`,
      cards: [{ type: "prompt", topicId: update.topicId }],
    };
  }

  if (proposal.updates.length) {
    if (!next) return { text: `Saved.${grew} Everything this goal needs is done or under way.` };
    return { text: `Saved.${grew} Next up: ${next.name}.`, cards: [{ type: "prompt", topicId: next.id }] };
  }
  return { text: "Saved. It'll shape your next prompts." };
}

/** Why a suspect is suspected, in the student's terms (design.md §8 explains every case). */
function weakBecause(s: Suspect, claims: Claim[]): string {
  const base = (() => {
    if (s.status === "shaky") {
      const src = claimSource(s.topic.id, claims);
      return src && src.topic.id !== s.topic.id ? `you said ${src.topic.name} was shaky.` : "you said it was shaky.";
    }
    if (s.status === "new") return "you haven't studied it yet.";
    if (s.status === "stuck") return "you're stuck on it too.";
    if (s.status === "done" && s.doubt) return "you marked it done, but it was hard going.";
    // Done cleanly: only the student's own words made it a suspect.
    if (s.status === "done") return "what you said about being stuck sounds like it.";
    return "it isn't solid yet.";
  })();
  // A text match on a topic that was suspected anyway: say that the words point there too.
  return s.matched && !(s.status === "done" && !s.doubt) ? `${base} What you said points there too.` : base;
}

// ---------------------------------------------------------------- questions about the map

function whatNext(ctx: HelperContext): Reply {
  if (!ctx.goal) return { text: "Pick a goal for this subject first, and I'll tell you where to start." };
  const next = nextTopic(ctx.goal, ctx.statuses);
  if (!next) return { text: "Everything this goal needs is done or under way. Nice." };
  const s = statusOf(ctx.statuses, next.id);
  const why = s === "learning" ? "You're partway through it." : s === "shaky" ? "You said it was shaky, and everything it needs is in place." : "Everything it needs is in place.";
  return { text: `Next up: ${next.name}, in ${topicById.get(bigOf(next.id))!.name}. ${why}`, cards: [{ type: "prompt", topicId: next.id }] };
}

function canSkip(id: string, ctx: HelperContext): Reply {
  if (!ctx.goal) return { text: "Pick a goal first: what you can skip depends on it." };
  const imp = importanceOf(id, ctx.goal, requiredFor(ctx.goal));
  return { text: `${topicById.get(id)!.name}: ${imp.reason}` };
}

function whyStuck(ctx: HelperContext): Reply {
  const stuck = ctx.goal ? sortByRoute([...requiredFor(ctx.goal)].map((id) => topicById.get(id)!).filter((t) => t.parentId)).find((t) => statusOf(ctx.statuses, t.id) === "stuck") : null;
  if (!stuck) return { text: "Nothing on your route is marked stuck. Tell me if something is, and I'll look underneath it." };
  const s = suspectsFor(stuck.id, ctx.statuses, ctx.checkIns, ctx.experiences)[0];
  if (!s) return { text: `You're stuck on ${stuck.name}, but everything it needs looks solid. Here's a prompt that tries a different way in.`, cards: [{ type: "prompt", topicId: stuck.id }] };
  return {
    text: `You're stuck on ${stuck.name}. It may be ${s.topic.name} underneath: ${stuck.name} needs it, and ${weakBecause(s, ctx.claims)}`,
    cards: [{ type: "prompt", topicId: s.topic.id }],
  };
}

// ---------------------------------------------------------------- how Trellis works
// The real helper gets this as a short guide in its instructions, so it never invents features.

// Keyed, so a Reading can name the entry (the model picks one of these keys in M5).
// Checked in this order: the first match wins.
const GUIDE = {
  faded: { when: /(faded|pale|grey|gray|see.?through)/i, say: "Faded topics aren't needed for your goal. They're not unimportant, just skippable for what you chose." },
  dashed: { when: /(dashed|dotted)/i, say: "A dashed border means the topic is optional inside its big topic." },
  big_topics: { when: /(big topic|closed|locked|hidden|opens?|reveal|look inside)/i, say: "Your map starts with big topics. Each one opens into its smaller topics when you reach it: when the next topic is inside, when you tell me about one of them, or when you press Look inside now." },
  goal: { when: /(change|switch).*(goal)|goal.*(change|switch)/i, say: "Use the goal menu next to the subject name at the top of the map. Your progress stays; only what counts as skippable changes." },
  prompts: { when: /(prompt).*(work|made|built|come from)|how.*prompt/i, say: "Each prompt is put together from three things: the topics you know around it, what you've told me about how things went, and fixed instructions for your AI. No AI writes it." },
  data: { when: /(delete|erase|remove).*(data|everything|account)|export/i, say: "Settings has Export and Delete everything. Single check-ins and notes can be changed or deleted on the Check-ins page." },
  theme: { when: /(dark|light) (mode|theme)|theme/i, say: "The theme follows your system. You can pick light or dark in Settings, or with the button at the top right." },
  what_you_do: { when: /(what can you do|help me|how do i use|what do you do)/i, say: "Tell me what you studied and how it went, and I'll update your map once you confirm. I can also tell you what's next, whether you can skip something, why you might be stuck, and give you a prompt for any topic." },
} satisfies Record<string, { when: RegExp; say: string }>;

export type HelpTopic = keyof typeof GUIDE;
export const HELP_TOPICS = Object.keys(GUIDE) as HelpTopic[];

function helpTopicIn(text: string): HelpTopic | null {
  return HELP_TOPICS.find((k) => GUIDE[k].when.test(text)) ?? null;
}

// ---------------------------------------------------------------- context

/** The question the helper asked just before the student's latest message, if it asked one. */
function pendingQuestion(ctx: HelperContext): ChatMessage["asks"] | null {
  const msgs = ctx.messages;
  const before = msgs.at(-1)?.role === "student" ? msgs.at(-2) : msgs.at(-1);
  return before?.role === "helper" && before.asks ? before.asks : null;
}

/** The topic a message without a name is probably about: the open panel, else the last one discussed. */
function contextTopic(ctx: HelperContext): string | null {
  const sel = ctx.selected ? topicById.get(ctx.selected) : null;
  if (sel?.parentId && sel.subjectId === ctx.subjectId) return sel.id;
  for (const m of [...ctx.messages].reverse()) {
    for (const c of m.cards ?? []) {
      if (c.type === "confirm" && c.proposal.updates.length === 1) return c.proposal.updates[0].topicId;
      if (c.type === "prompt") return c.topicId;
    }
    if (m.asks?.pending.updates.length === 1) return m.asks.pending.updates[0].topicId;
  }
  return null;
}

/** Things to try saying, built from the student's own map. */
export function suggestions(ctx: HelperContext): string[] {
  const next = ctx.goal ? nextTopic(ctx.goal, ctx.statuses) : null;
  const out = ["What should I do next?"];
  if (next) out.push(`I finished ${next.name}`, `I'm stuck on ${next.name}`);
  const optional = ctx.goal
    ? sortByRoute([...requiredFor(ctx.goal)].map((id) => topicById.get(id)!).filter((t) => t.parentId))
        .flatMap((t) => kids(t.parentId!))
        .find((t) => t.optional && !requiredFor(ctx.goal!).has(t.id))
    : null;
  if (optional) out.push(`Can I skip ${optional.name}?`);
  return out;
}

/** A first message for an empty conversation. Not saved. */
export function greeting(ctx: HelperContext): Reply {
  const subject = subjectById.get(ctx.subjectId)!;
  return {
    text: `Hi. Tell me what you studied in ${subject.name} and how it went, and I'll keep your map up to date. I'll always check with you before saving anything.`,
    cards: [{ type: "suggest", options: suggestions(ctx) }],
  };
}
