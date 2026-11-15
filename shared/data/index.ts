import type { Difficulty, Edge, Goal, Subject, SubjectId, Topic } from "../types";
import type { RawTopic, Shortcut, SubjectFile } from "./build";

export type { Shortcut } from "./build";
import { reactNative } from "./react-native";
import { redis } from "./redis";

/**
 * Every subject, in the order screens list them. Adding a subject is one line here, plus
 * its id in SubjectId (shared/types.ts); docs/subject-blueprint.md has the whole procedure.
 */
const files: SubjectFile[] = [reactNative, redis];

export const subjects: Subject[] = files.map((f) => f.subject);

/**
 * roadmap.sh, where the first two subjects' topic lists started (14 Nov 2026: new subjects
 * are designed from official sources instead, docs/subject-blueprint.md). Credited only
 * for the subjects whose `source` is on it.
 */
export const SOURCE = { name: "roadmap.sh", url: "https://roadmap.sh" };
export const fromRoadmapSh = subjects.filter((s) => s.source?.startsWith(SOURCE.url));

/** "React Native and Redis": a list of subjects as a sentence fragment. */
export function namesOf(list: Subject[]): string {
  const names = list.map((s) => s.name);
  return names.length < 2 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** "React Native and Redis", "React Native, Redis and MongoDB": for sentences that list them. */
export const subjectNames = namesOf(subjects);

const raw: RawTopic[] = files.flatMap((f) => f.topics);
const difficultyOf: Record<string, Difficulty> = Object.assign({}, ...files.map((f) => f.difficulty));
const written: Edge[] = files.flatMap((f) => f.edges);

/**
 * The "needs" links between big topics, worked out from the links between subtopics.
 *
 * Big topic A needs big topic B when a CORE subtopic of A needs a subtopic inside B. Optional
 * subtopics don't count: a big topic's links decide what a goal requires and when a big topic
 * is ready (graph.ts, requiredFor and isReady), and something the student may skip must not
 * hold a whole area back. A link that a longer path already implies is dropped (A → C when
 * A → B → C), because the map would draw it as one more line saying nothing new.
 *
 * Why not write them by hand, as before 14 Nov 2026: the two levels drifted apart. The map
 * said Networking needs Core components while Fetch only needed State, so hovering Fetch lit
 * React basics and left the Core components arrow dark. Worked out, they can't disagree.
 * The cost: changing one subtopic link can move a big topic on the map. That is the point,
 * but check the map after editing links (docs/frontend.md, "Editing the topic graphs").
 */
function bigNeedsFrom(links: Edge[]): Edge[] {
  const byId = new Map(raw.map((t) => [t.id, t]));
  const pairs = new Map<string, Set<string>>();
  for (const e of links) {
    const a = byId.get(e.from);
    const b = byId.get(e.to);
    if (e.kind !== "needs" || !a?.parentId || !b?.parentId || a.parentId === b.parentId || a.optional) continue;
    pairs.set(a.parentId, (pairs.get(a.parentId) ?? new Set()).add(b.parentId));
  }
  // Is `to` reachable from `from` without using the direct link between them?
  const reachesAround = (from: string, to: string): boolean => {
    const stack = [...(pairs.get(from) ?? [])].filter((n) => n !== to);
    const seen = new Set<string>();
    while (stack.length) {
      const cur = stack.pop()!;
      if (cur === to) return true;
      if (seen.has(cur)) continue;
      seen.add(cur);
      stack.push(...(pairs.get(cur) ?? []));
    }
    return false;
  };
  // In the order the subject files list the big topics, so the output is stable from run to
  // run (the graph seed stores edges in this order).
  const order = raw.filter((t) => !t.parentId).map((t) => t.id);
  const out: Edge[] = [];
  for (const from of order) {
    for (const to of order) {
      if (pairs.get(from)?.has(to) && !reachesAround(from, to)) out.push({ from, to, kind: "needs" });
    }
  }
  return out;
}

/** Every link: big-topic needs (worked out), then what the subject files write. */
export const edges: Edge[] = [...bigNeedsFrom(written), ...written];
export const goals: Goal[] = files.flatMap((f) => f.goals);

/** The sort's one-tap answers for a subject (build.ts, Shortcut); most subjects have none. */
export function shortcutsOf(subjectId: SubjectId): Shortcut[] {
  return files.find((f) => f.subject.id === subjectId)?.shortcuts ?? [];
}

const RANK: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 2 };

/**
 * A big topic's difficulty: the hardest of its core subtopics. "The hardest thing you
 * can't skip in it" is what a student wants to know before starting a chunk. An average
 * would call Persistence "medium" while it holds two hard topics; optional ones are left
 * out because the student can skip them. A missing rating counts as medium, so a topic
 * added without one still gets the question; the check below reports it.
 */
function hardestCore(inside: Topic[]): Difficulty {
  const core = inside.filter((t) => !t.optional);
  return (core.length ? core : inside).reduce<Difficulty>((d, t) => (RANK[t.difficulty] > RANK[d] ? t.difficulty : d), "easy");
}

const subs: Topic[] = raw.filter((t) => t.parentId).map((t) => ({ ...t, difficulty: difficultyOf[t.id] ?? "medium" }));

/** Subtopics of each big topic, in the order the subject file lists them. */
export const childrenOf = new Map<string, Topic[]>();
for (const t of subs) childrenOf.set(t.parentId!, [...(childrenOf.get(t.parentId!) ?? []), t]);

// A big topic's time is the time of what's inside it, and its difficulty the hardest core part.
const subById = new Map(subs.map((t) => [t.id, t]));
export const topics: Topic[] = raw.map((t) => {
  if (t.parentId) return subById.get(t.id)!;
  const inside = childrenOf.get(t.id) ?? [];
  return { ...t, minutes: inside.reduce((m, c) => m + c.minutes, 0), difficulty: hardestCore(inside) };
});

export const topicById = new Map(topics.map((t) => [t.id, t]));
export const subjectById = new Map(subjects.map((s) => [s.id, s]));
export const goalById = new Map(goals.map((g) => [g.id, g]));

export const isBig = (t: Topic) => t.parentId === null;
export const kids = (id: string) => childrenOf.get(id) ?? [];

/** The big topic a subtopic belongs to; a big topic is its own. */
export const bigOf = (id: string) => topicById.get(id)?.parentId ?? id;

export function topicsOf(subjectId: SubjectId): Topic[] {
  return topics.filter((t) => t.subjectId === subjectId);
}

export function bigTopicsOf(subjectId: SubjectId): Topic[] {
  return topics.filter((t) => t.subjectId === subjectId && t.parentId === null);
}

export function subtopicsOf(subjectId: SubjectId): Topic[] {
  return topics.filter((t) => t.subjectId === subjectId && t.parentId !== null);
}

export function goalsOf(subjectId: SubjectId): Goal[] {
  return goals.filter((g) => g.subjectId === subjectId);
}

// ---------------------------------------------------------------- checks
// The data must agree with itself. These run once on load; read the console.

{
  // Each file's topics and goals belong to its own subject: a copied line from another
  // subject's file would otherwise put a topic on the wrong map.
  for (const f of files) {
    for (const t of f.topics) console.assert(t.subjectId === f.subject.id, `${t.id} is in ${f.subject.id}'s file but says ${t.subjectId}`);
    for (const g of f.goals) console.assert(g.subjectId === f.subject.id, `goal ${g.id} is in ${f.subject.id}'s file but says ${g.subjectId}`);
  }

  const ids = new Set<string>();
  for (const t of topics) {
    console.assert(!ids.has(t.id), `duplicate topic id ${t.id}`);
    ids.add(t.id);
    if (t.parentId) {
      const p = topicById.get(t.parentId);
      console.assert(p && p.parentId === null && p.subjectId === t.subjectId, `${t.id} has a bad parent ${t.parentId}`);
    } else {
      const inside = kids(t.id);
      console.assert(inside.length > 0, `big topic ${t.id} has no subtopics`);
      console.assert(inside.some((c) => !c.optional), `big topic ${t.id} has no core subtopic`);
    }
  }

  // Every subtopic has a difficulty rating, and every rating belongs to a subtopic.
  for (const t of raw) if (t.parentId) console.assert(t.id in difficultyOf, `${t.id} has no difficulty rating`);
  for (const id of Object.keys(difficultyOf)) {
    console.assert(Boolean(topicById.get(id)?.parentId), `difficulty rating for ${id}, which isn't a subtopic`);
  }

  // Big-topic "needs" links are worked out above; a subject file writing one would bypass that.
  for (const e of written) {
    console.assert(!(e.kind === "needs" && !topicById.get(e.from)?.parentId), `${e.from} → ${e.to}: big-topic needs links are worked out, don't write them`);
  }

  const bigNeeds = new Map<string, string[]>();
  for (const e of edges) {
    const a = topicById.get(e.from);
    const b = topicById.get(e.to);
    console.assert(a && b, `edge points at a missing topic: ${e.from} → ${e.to}`);
    if (!a || !b) continue;
    console.assert(a.subjectId === b.subjectId, `edge crosses subjects: ${e.from} → ${e.to}`);
    console.assert(isBig(a) === isBig(b), `edge mixes a big topic and a subtopic: ${e.from} → ${e.to}`);
    if (e.kind === "needs" && isBig(a)) bigNeeds.set(a.id, [...(bigNeeds.get(a.id) ?? []), b.id]);
  }

  const reaches = (from: string, to: string): boolean => {
    const stack = [from];
    const seen = new Set<string>();
    while (stack.length) {
      const cur = stack.pop()!;
      if (cur === to) return true;
      if (seen.has(cur)) continue;
      seen.add(cur);
      stack.push(...(bigNeeds.get(cur) ?? []));
    }
    return false;
  };

  for (const e of edges) {
    const a = topicById.get(e.from);
    const b = topicById.get(e.to);
    if (!a?.parentId || !b?.parentId || e.kind !== "needs" || a.parentId === b.parentId) continue;
    // A subtopic may only need one from another big topic if its own big topic stands on that
    // one. Core subtopics always pass (they make the big-topic links); this catches optional ones.
    console.assert(reaches(a.parentId, b.parentId), `${e.from} needs ${e.to}, but ${a.parentId} doesn't stand on ${b.parentId}`);
  }

  // No loops among hard prerequisites.
  const needs = new Map<string, string[]>();
  for (const e of edges) if (e.kind === "needs") needs.set(e.from, [...(needs.get(e.from) ?? []), e.to]);
  const state = new Map<string, 1 | 2>();
  const visit = (id: string, path: string[]): void => {
    if (state.get(id) === 2) return;
    console.assert(state.get(id) !== 1, `prerequisite loop: ${[...path, id].join(" → ")}`);
    if (state.get(id) === 1) return;
    state.set(id, 1);
    for (const n of needs.get(id) ?? []) visit(n, [...path, id]);
    state.set(id, 2);
  };
  for (const t of topics) visit(t.id, []);

  // A "helps" link that a chain of "needs" already covers is one more line saying less.
  const needsPath = (from: string, to: string): boolean => {
    const stack = [...(needs.get(from) ?? [])];
    const seen = new Set<string>();
    while (stack.length) {
      const cur = stack.pop()!;
      if (cur === to) return true;
      if (seen.has(cur)) continue;
      seen.add(cur);
      stack.push(...(needs.get(cur) ?? []));
    }
    return false;
  };
  for (const e of edges) {
    if (e.kind === "helps") console.assert(!needsPath(e.from, e.to), `${e.from} helps ${e.to}, but it already needs it`);
  }

  // Every subtopic is linked to something: a box with no lines tells the student nothing
  // about where it fits, and the map has no good place to put it. (Big topics are linked
  // through their subtopics.)
  for (const t of topics) {
    if (t.parentId) console.assert(edges.some((e) => e.from === t.id || e.to === t.id), `${t.id} has no links`);
  }

  // A shortcut can only mark topics of its own subject.
  for (const f of files) {
    for (const s of f.shortcuts ?? []) {
      for (const id of s.topics) {
        console.assert(topicById.get(id)?.subjectId === f.subject.id, `shortcut ${s.id} marks ${id}, which isn't a topic of ${f.subject.id}`);
      }
    }
  }

  for (const g of goals) {
    for (const id of g.targets) {
      const t = topicById.get(id);
      console.assert(t?.subjectId === g.subjectId && t.parentId === null, `goal ${g.id} targets ${id}, which isn't a big topic in its subject`);
    }
  }
}
