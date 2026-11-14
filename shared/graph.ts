// Everything the screens show is computed here from topics, edges, claims and
// check-ins. Nothing derived is stored.
//
// The map has two levels. Big topics hold subtopics; subtopics are what you study.
// A subtopic inherits what you said about its big topic at the sort. A big topic's
// status is summed up from its subtopics.

import { bigOf, edges, isBig, kids, subtopicsOf, topicById, topics } from "./data";
import { mentions } from "./parse";
import type { CheckIn, Claim, Experience, Goal, PromptTake, Status, SubjectId, Topic } from "./types";

const needsOut = new Map<string, string[]>();
const helpsOut = new Map<string, string[]>();
const needsIn = new Map<string, string[]>();
for (const e of edges) {
  const out = e.kind === "needs" ? needsOut : helpsOut;
  out.set(e.from, [...(out.get(e.from) ?? []), e.to]);
  if (e.kind === "needs") needsIn.set(e.to, [...(needsIn.get(e.to) ?? []), e.from]);
}

export const needsOf = (id: string) => needsOut.get(id) ?? [];
export const helpsOf = (id: string) => helpsOut.get(id) ?? [];
export const neededBy = (id: string) => needsIn.get(id) ?? [];

// ---------------------------------------------------------------- statuses

export function deriveStatuses(claims: Claim[], checkIns: CheckIn[]): Map<string, Status> {
  const own = new Map<string, Status>();
  for (const c of claims) {
    if (c.claim !== "new") own.set(c.topicId, c.claim);
    else own.delete(c.topicId);
  }
  const ordered = [...checkIns].sort((a, b) => a.at.localeCompare(b.at));
  for (const c of ordered) {
    own.set(c.topicId, c.outcome === "got" ? "done" : c.outcome === "partly" ? "learning" : "stuck");
  }

  const map = new Map<string, Status>();
  for (const t of topics) {
    if (isBig(t)) continue;
    const s = own.get(t.id) ?? own.get(t.parentId!);
    if (s) map.set(t.id, s);
  }
  for (const t of topics) {
    if (!isBig(t)) continue;
    const s = bigStatus(t.id, map, own.get(t.id));
    if (s !== "new") map.set(t.id, s);
  }
  return map;
}

function bigStatus(id: string, subs: Map<string, Status>, claimed: Status | undefined): Status {
  const inside = kids(id).map((c) => ({ c, s: subs.get(c.id) ?? "new" }));
  const core = inside.filter((x) => !x.c.optional);
  if (core.every((x) => isFooting(x.s))) return inside.some((x) => x.s === "done") ? "done" : "know";
  if (inside.some((x) => x.s === "stuck")) return "stuck";
  if (inside.some((x) => x.s === "learning" || x.s === "done")) return "learning";
  return claimed === "shaky" ? "shaky" : "new";
}

export const statusOf = (statuses: Map<string, Status>, id: string): Status => statuses.get(id) ?? "new";

/** Solid enough to build on: proven, or claimed as known. */
export const isFooting = (s: Status) => s === "done" || s === "know";

export const STATUS_LABEL: Record<Status, string> = {
  new: "New",
  know: "Said I know",
  shaky: "Said shaky",
  learning: "Learning",
  stuck: "Stuck",
  done: "Done",
};

/** How far into a big topic you are: core subtopics on firm footing, of all core ones. */
export function progressOf(bigId: string, statuses: Map<string, Status>) {
  const core = kids(bigId).filter((c) => !c.optional);
  return { done: core.filter((c) => isFooting(statusOf(statuses, c.id))).length, total: core.length, all: kids(bigId).length };
}

// ---------------------------------------------------------------- order

const depthCache = new Map<string, number>();
/** Longest chain of hard prerequisites below a topic. Foundations are 0. */
export function depthOf(id: string): number {
  const hit = depthCache.get(id);
  if (hit !== undefined) return hit;
  const d = needsOf(id).reduce((m, p) => Math.max(m, depthOf(p) + 1), 0);
  depthCache.set(id, d);
  return d;
}

const fileOrder = new Map(topics.map((t, i) => [t.id, i]));

/** The order to learn things in: earlier big topics first, then prerequisites first inside them. */
export function byRoute(a: Topic, b: Topic): number {
  return (
    depthOf(bigOf(a.id)) - depthOf(bigOf(b.id)) ||
    fileOrder.get(bigOf(a.id))! - fileOrder.get(bigOf(b.id))! ||
    depthOf(a.id) - depthOf(b.id) ||
    fileOrder.get(a.id)! - fileOrder.get(b.id)!
  );
}

export const sortByRoute = (list: Topic[]) => [...list].sort(byRoute);

// ---------------------------------------------------------------- goals

/**
 * Everything a goal needs: its big topics and every big topic they stand on, the core
 * subtopics inside those, and anything a needed subtopic needs in turn.
 */
export function requiredFor(goal: Goal): Set<string> {
  const seen = new Set<string>();
  const stack = [...goal.targets];
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    stack.push(...needsOf(id));
  }
  const subStack = [...seen].flatMap((id) => kids(id).filter((c) => !c.optional).map((c) => c.id));
  while (subStack.length) {
    const id = subStack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    subStack.push(...needsOf(id));
  }
  return seen;
}

export interface GoalSummary {
  /** Big topics the goal needs, in route order. */
  areas: Topic[];
  /** Subtopics the goal needs, in route order. These are what get counted. */
  route: Topic[];
  /** Subtopics you can skip: optional ones, and everything in big topics the goal doesn't need. */
  skippable: Topic[];
  done: number;
  stuck: number;
  left: number;
  areasDone: number;
}

export function summarise(goal: Goal, statuses: Map<string, Status>): GoalSummary {
  const required = requiredFor(goal);
  const subs = subtopicsOf(goal.subjectId);
  const route = sortByRoute(subs.filter((t) => required.has(t.id)));
  const areas = sortByRoute([...required].map((id) => topicById.get(id)!).filter(isBig));
  const skippable = sortByRoute(subs.filter((t) => !required.has(t.id)));
  const done = route.filter((t) => isFooting(statusOf(statuses, t.id))).length;
  const stuck = route.filter((t) => statusOf(statuses, t.id) === "stuck").length;
  const areasDone = areas.filter((t) => isFooting(statusOf(statuses, t.id))).length;
  return { areas, route, skippable, done, stuck, left: route.length - done, areasDone };
}

/** A subtopic is ready when what it needs is solid and its big topic's prerequisites are too. */
export function isReady(statuses: Map<string, Status>, id: string): boolean {
  const own = needsOf(id).every((p) => isFooting(statusOf(statuses, p)));
  const t = topicById.get(id);
  if (!t?.parentId) return own;
  return own && isReady(statuses, t.parentId);
}

/**
 * The one subtopic to do now: something already in progress that is ready,
 * otherwise the first ready one on the route. Stuck topics have their own card.
 */
export function nextTopic(goal: Goal, statuses: Map<string, Status>): Topic | null {
  const { route } = summarise(goal, statuses);
  const open = route.filter((t) => {
    const s = statusOf(statuses, t.id);
    return s !== "done" && s !== "stuck" && s !== "know" && isReady(statuses, t.id);
  });
  return open.find((t) => statusOf(statuses, t.id) === "learning") ?? open[0] ?? null;
}

// ---------------------------------------------------------------- what the map shows

/**
 * Big topics whose subtopics are on the map. A big topic opens when you reach it:
 * you've checked in on something inside it, the next topic is inside it, it holds
 * the likely reason you're stuck, or you chose to look inside.
 */
export function revealed(
  subjectId: SubjectId,
  statuses: Map<string, Status>,
  checkIns: CheckIn[],
  nextId: string | null,
  opened: string[],
  // Needed because a stuck topic's first suspect opens its big topic, and the suspects
  // depend on what the student said (suspectsFor). Without it the map could open a
  // different frame than the one the Stuck button names.
  experiences: Experience[],
): Set<string> {
  const out = new Set<string>();
  for (const c of checkIns) {
    const t = topicById.get(c.topicId);
    if (t?.subjectId === subjectId && t.parentId) out.add(t.parentId);
  }
  if (nextId) out.add(bigOf(nextId));
  for (const t of subtopicsOf(subjectId)) {
    if (statusOf(statuses, t.id) !== "stuck") continue;
    const s = suspectsFor(t.id, statuses, checkIns, experiences)[0];
    if (s) out.add(bigOf(s.topic.id));
  }
  for (const id of opened) if (topicById.get(id)?.subjectId === subjectId) out.add(id);
  return out;
}

// ---------------------------------------------------------------- skip or not

export interface Importance {
  /** "keep": don't skip it. "skip": safe to leave for now. */
  verdict: "keep" | "skip";
  /** One sentence for the student. */
  reason: string;
  /** Later topics on the goal that stand on this one. */
  dependents: Topic[];
}

/** Whether a topic matters for the goal, and why, in plain words. */
export function importanceOf(id: string, goal: Goal, required: Set<string>): Importance {
  const t = topicById.get(id)!;
  const dependents = sortByRoute(neededBy(id).filter((d) => required.has(d)).map((d) => topicById.get(d)!));
  const names = list(dependents.slice(0, 3).map((d) => d.name)) + (dependents.length > 3 ? ` and ${dependents.length - 3} more` : "");

  if (isBig(t)) {
    if (!required.has(id)) return { verdict: "skip", reason: `Not needed for “${goal.name}”.`, dependents };
    return {
      verdict: "keep",
      reason: dependents.length ? `On your route. ${names} ${dependents.length === 1 ? "stands" : "stand"} on it.` : "On your route: your goal is built from it.",
      dependents,
    };
  }

  if (required.has(id)) {
    if (dependents.length) {
      return {
        verdict: "keep",
        reason: `Don't skip this. ${names} ${dependents.length === 1 ? "builds" : "build"} on it${t.optional ? ", even though it's optional on its own" : ""}.`,
        dependents,
      };
    }
    return { verdict: "keep", reason: "Don't skip this. It's a core part of your goal.", dependents };
  }

  const parent = topicById.get(t.parentId!)!;
  if (!required.has(parent.id)) {
    return { verdict: "skip", reason: `You can skip this. ${parent.name} isn't needed for “${goal.name}”.`, dependents };
  }
  return { verdict: "skip", reason: "You can skip this for now. It's optional, and nothing on your goal needs it.", dependents };
}

function list(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

// ---------------------------------------------------------------- being stuck

// How weak the evidence is that the student really has a prerequisite (design.md §8).
// Lower is weaker, so more likely to be why they're stuck. A cleanly done topic has no
// rank: it is not a suspect unless the student's own words point at it.
const WEAKNESS: Record<Exclude<Status, "done">, number> = { new: 0, stuck: 1, shaky: 2, learning: 3, know: 4 };
const DONE_WITH_DOUBT = 5;
const WORDS_LIFT = 3; // a text match moves a suspect up this many ranks
const WORDS_MAKE_DONE_SUSPECT = 3; // the rank a cleanly done topic gets from a text match

export interface Suspect {
  topic: Topic;
  status: Status;
  /** From the stuck topic down to the suspect. */
  path: string[];
  /** 0 (weakest evidence) to 5. Ties go to fewer steps, then file order. */
  rank: number;
  /** Marked done, but it was hard: a "hard" note, or stuck or partly on it before. */
  doubt: boolean;
  /** What the student said about being stuck points at it. */
  matched: boolean;
}

/**
 * Why the student may be stuck on `stuckId`: its prerequisites up to two steps down,
 * weakest evidence first. A fixed rule, never an AI's opinion, so it can always be
 * explained (design.md §8, §11 promise 5).
 *
 * The student's own words (their latest "stuck" check-in on the topic and its "hard"
 * notes) lift a candidate whose name, keywords or common mistakes they echo.
 */
export function suspectsFor(
  stuckId: string,
  statuses: Map<string, Status>,
  checkIns: CheckIn[],
  experiences: Experience[],
): Suspect[] {
  const found = new Map<string, string[]>();
  for (const a of needsOf(stuckId)) {
    if (!found.has(a)) found.set(a, [stuckId, a]);
    for (const b of needsOf(a)) if (!found.has(b)) found.set(b, [stuckId, a, b]);
  }
  const words = stuckWords(stuckId, checkIns, experiences);

  const out: Suspect[] = [];
  for (const [id, path] of found) {
    const topic = topicById.get(id)!;
    const status = statusOf(statuses, id);
    const matched = words !== "" && pointsAt(words, topic);
    const doubt = status === "done" && doneWithDoubt(id, checkIns, experiences);

    let rank: number | null;
    if (status !== "done") rank = WEAKNESS[status];
    else if (doubt) rank = DONE_WITH_DOUBT;
    else rank = null; // done cleanly
    if (matched) rank = rank === null ? WORDS_MAKE_DONE_SUSPECT : Math.max(0, rank - WORDS_LIFT);
    if (rank !== null) out.push({ topic, status, path, rank, doubt, matched });
  }
  return out.sort((x, y) => x.rank - y.rank || x.path.length - y.path.length || fileOrder.get(x.topic.id)! - fileOrder.get(y.topic.id)!);
}

/** The student's words about being stuck on this topic: the latest stuck check-in, plus its hard notes. */
function stuckWords(stuckId: string, checkIns: CheckIn[], experiences: Experience[]): string {
  const latestStuck = checkIns
    .filter((c) => c.topicId === stuckId && c.outcome === "stuck")
    .sort((a, b) => b.at.localeCompare(a.at))[0];
  const hard = experiences.filter((e) => e.topicId === stuckId && e.kind === "hard").map((e) => e.text);
  return [latestStuck?.text ?? "", ...hard].join(" \n ").trim();
}

/** Do these words name the topic, use one of its keywords, or echo one of its common mistakes? */
function pointsAt(words: string, topic: Topic): boolean {
  if (mentions(words, topic.name) || topic.keywords.some((k) => mentions(words, k))) return true;
  const said = shingles(words);
  return topic.mistakes.some((m) => [...shingles(m)].some((p) => said.has(p)));
}

/**
 * Every run of three words, lower-cased, punctuation dropped: "nothing re-renders at all"
 * gives "nothing re renders" and "re renders at". Three words because one or two shared
 * words ("the state") match almost anything; a shared phrase of three rarely happens by
 * chance.
 */
function shingles(text: string): Set<string> {
  const w = text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const out = new Set<string>();
  for (let i = 0; i + 3 <= w.length; i++) out.add(w.slice(i, i + 3).join(" "));
  return out;
}

/**
 * Done, but it was hard getting there: a "hard" note on it, or a stuck or partly check-in
 * before the "got" that made it done. For a big topic, its subtopics' history counts.
 */
function doneWithDoubt(id: string, checkIns: CheckIn[], experiences: Experience[]): boolean {
  const ids = new Set([id, ...kids(id).map((k) => k.id)]);
  if (experiences.some((e) => ids.has(e.topicId) && e.kind === "hard")) return true;
  for (const tid of ids) {
    const mine = checkIns.filter((c) => c.topicId === tid).sort((a, b) => a.at.localeCompare(b.at));
    let lastGot = -1;
    mine.forEach((c, i) => {
      if (c.outcome === "got") lastGot = i;
    });
    if (lastGot > 0 && mine.slice(0, lastGot).some((c) => c.outcome !== "got")) return true;
  }
  return false;
}

/** Where a subtopic's status came from, if it was said at the sort rather than earned. */
export function claimSource(id: string, claims: Claim[]): { topic: Topic; claim: Claim } | null {
  const t = topicById.get(id);
  if (!t) return null;
  const latest = (tid: string) =>
    [...claims].filter((c) => c.topicId === tid).sort((a, b) => b.at.localeCompare(a.at))[0];
  const own = latest(id);
  if (own) return { topic: t, claim: own };
  const parent = t.parentId ? latest(t.parentId) : undefined;
  return parent ? { topic: topicById.get(t.parentId!)!, claim: parent } : null;
}

export interface Unlock {
  stuckOn: Topic;
  via: Topic;
  stuckAt: string;
  solvedAt: string;
  clicked?: string;
}

/** Times a stuck topic came good right after its prerequisite did: what worked before. */
export function pastUnlocks(checkIns: CheckIn[], experiences: Experience[] = []): Unlock[] {
  const ordered = [...checkIns].sort((a, b) => a.at.localeCompare(b.at));
  const out: Unlock[] = [];
  for (const stuck of ordered.filter((c) => c.outcome === "stuck")) {
    const solved = ordered.find((c) => c.topicId === stuck.topicId && c.outcome === "got" && c.at > stuck.at);
    if (!solved) continue;
    const below = new Set([...needsOf(stuck.topicId), ...needsOf(stuck.topicId).flatMap(needsOf)]);
    const via = ordered.find((c) => below.has(c.topicId) && c.outcome === "got" && c.at > stuck.at && c.at < solved.at);
    if (via) {
      out.push({
        stuckOn: topicById.get(stuck.topicId)!,
        via: topicById.get(via.topicId)!,
        stuckAt: stuck.at,
        solvedAt: solved.at,
        clicked: experiences.find((e) => e.topicId === stuck.topicId && e.kind === "clicked" && e.at >= stuck.at)?.text,
      });
    }
  }
  return out;
}

export function lastCheckIn(checkIns: CheckIn[], topicId: string, outcome?: CheckIn["outcome"]) {
  return [...checkIns]
    .filter((c) => c.topicId === topicId && (!outcome || c.outcome === outcome))
    .sort((a, b) => b.at.localeCompare(a.at))[0];
}

// ---------------------------------------------------------------- dates

const DAY = 86_400_000;

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(toIso.slice(0, 10)) - Date.parse(fromIso.slice(0, 10))) / DAY);
}

export function shortDate(iso: string): string {
  return new Date(iso.slice(0, 10) + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function relativeDay(iso: string, today: string): string {
  const d = daysBetween(iso, today);
  if (d === 0) return "Today";
  if (d === 1) return "Yesterday";
  if (d < 7) return `${d} days ago`;
  return shortDate(iso);
}

/** The student's latest experience of a kind on a topic. */
export function lastExperience(experiences: Experience[], topicId: string, kind?: Experience["kind"]) {
  return [...experiences]
    .filter((e) => e.topicId === topicId && (!kind || e.kind === kind))
    .sort((a, b) => b.at.localeCompare(a.at))[0];
}

// ---------------------------------------------------------------- coming back (MS.3)

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;

/**
 * The topic to ask "how did it go?" about when the student comes back (design.md §7):
 * the latest prompt they took on a subtopic that has had no check-in since, taken between
 * 10 minutes and 14 days ago. Null when there is none.
 *
 * - 10 minutes: right after taking a prompt they are still working on it; asking then
 *   would nag.
 * - 14 days: after that the question is stale, and design.md §10 says a returning student
 *   gets one next step, not a backlog.
 * - Subtopics only: the answer becomes a check-in, and check-ins are on subtopics.
 *
 * Pass the takes of one subject: the helper asks inside that subject's thread.
 */
export function awaitingReport(promptTakes: PromptTake[], checkIns: CheckIn[], now: Date): PromptTake | null {
  const t = now.getTime();
  const newestFirst = [...promptTakes].sort((a, b) => b.at.localeCompare(a.at));
  for (const take of newestFirst) {
    const age = t - new Date(take.at).getTime();
    if (age < 10 * MINUTE_MS) continue;
    if (age > 14 * DAY_MS) break; // sorted newest first: everything after is older still
    if (!topicById.get(take.topicId)?.parentId) continue;
    const reported = checkIns.some((c) => c.topicId === take.topicId && c.at > take.at);
    if (!reported) return take;
  }
  return null;
}

/**
 * Big topics a goal needs that the student never sorted (no claim on them), in route
 * order. After a goal change, these are offered as a short sort instead of the whole deck.
 */
export function unsortedAreas(goal: Goal, claims: Claim[]): Topic[] {
  const claimed = new Set(claims.map((c) => c.topicId));
  return sortByRoute([...requiredFor(goal)].map((id) => topicById.get(id)!).filter((t) => isBig(t) && !claimed.has(t.id)));
}
