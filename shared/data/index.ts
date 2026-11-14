import type { Difficulty, Edge, Goal, Subject, SubjectId, Topic } from "../types";
import type { RawTopic } from "./build";
import { reactNativeDifficulty, reactNativeEdges, reactNativeGoals, reactNativeTopics } from "./react-native";
import { redisDifficulty, redisEdges, redisGoals, redisTopics } from "./redis";

export const subjects: Subject[] = [
  {
    id: "react-native",
    name: "React Native",
    shortName: "React Native",
    blurb: "Mobile apps in JavaScript, from your first screen to the app stores.",
  },
  {
    id: "redis",
    name: "Redis",
    shortName: "Redis",
    blurb: "The in-memory data store: data structures, persistence and running it in production.",
  },
];

/** Where the topic lists come from. Shown wherever a map is introduced. */
export const SOURCE = { name: "roadmap.sh", url: "https://roadmap.sh" };

const raw: RawTopic[] = [...reactNativeTopics, ...redisTopics];
const difficultyOf: Record<string, Difficulty> = { ...reactNativeDifficulty, ...redisDifficulty };
export const edges: Edge[] = [...reactNativeEdges, ...redisEdges];
export const goals: Goal[] = [...reactNativeGoals, ...redisGoals];

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
    // A subtopic may only need one from another big topic if its own big topic stands on that one.
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

  for (const g of goals) {
    for (const id of g.targets) {
      const t = topicById.get(id);
      console.assert(t?.subjectId === g.subjectId && t.parentId === null, `goal ${g.id} targets ${id}, which isn't a big topic in its subject`);
    }
  }
}
