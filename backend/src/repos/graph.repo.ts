// Reads the topic graph: the subjects, their topics, links and goals.
//
// The graph lives in the reviewed files in shared/data, the same files the frontend and
// shared/graph.ts read, so the API can't serve a map that disagrees with the answers they
// compute. It's under 500 topics: held in memory it costs well under a megabyte, and every
// read is a lookup. There is no database to run, seed or keep in step with the files.
//
// Why not a graph database: one was used until 21 Nov 2026 and dropped. It took 768 MB of
// the server's 2 GB, needed a seed on every release and a check that its copy still matched
// the files, and the one query it was there for (findPath below) is a breadth-first search
// of a few lines over data this small. The trade-off: the graph changes only with a
// release, which was already true.
//
// The functions are synchronous because nothing waits on I/O. If the graph ever moves to
// a database (students editing it, say), they become async and the controllers add an
// `await`; nothing else changes.

import type { Edge, Goal, Subject, SubjectId, Topic } from "@shared/types";
import { edges, goalsOf, subjectById, subjects, topicById, topics, topicsOf } from "@shared/data";

export interface SubjectGraph {
  topics: Topic[];
  edges: Edge[];
  goals: Goal[];
}

export function getSubjects(): Subject[] {
  return subjects;
}

/** One subject's whole map, in the order the files list it. Null if there's no such subject. */
export function getSubjectGraph(subjectId: string): SubjectGraph | null {
  if (!subjectById.has(subjectId as SubjectId)) return null;
  const id = subjectId as SubjectId;
  return {
    topics: topicsOf(id),
    // Links never cross subjects (shared/data checks that), so the `from` end decides.
    edges: edges.filter((e) => topicById.get(e.from)?.subjectId === id),
    goals: goalsOf(id),
  };
}

// ---------------------------------------------------------------- the path query

// "needs" links by their dependent end, in file order: needsFrom.get(a) = what a needs.
const needsFrom = new Map<string, string[]>();
for (const e of edges) {
  if (e.kind === "needs") needsFrom.set(e.from, [...(needsFrom.get(e.from) ?? []), e.to]);
}
// A topic's place in the files, to break ties the same way every time.
const position = new Map(topics.map((t, i) => [t.id, i]));
const byPosition = (a: string, b: string) => position.get(a)! - position.get(b)!;

/**
 * The chain of prerequisites from one topic up to another, in learning order:
 * findPath("rn-jsx", "rn-state") → [JSX, Components, State], because State needs
 * Components, which needs JSX.
 *
 *   null  either topic doesn't exist
 *   []    both exist, but `toId` doesn't stand on `fromId` (other way round, or another
 *         subject)
 *
 * A breadth-first search from the target down its "needs" links, so the first time it
 * reaches `fromId` is by a shortest chain. When two chains are equally short, it takes the
 * one whose topics come first in the files: each topic's prerequisites are visited in file
 * order and a topic keeps the first route that reached it. Without that rule the answer
 * could change from one run to the next.
 */
export function findPath(fromId: string, toId: string): Topic[] | null {
  if (!topicById.has(fromId) || !topicById.has(toId)) return null;

  // cameFrom.get(x) = the topic one step closer to the target. Doubles as "seen".
  const cameFrom = new Map<string, string | null>([[toId, null]]);
  const queue = [toId];
  while (queue.length > 0 && !cameFrom.has(fromId)) {
    const current = queue.shift()!;
    for (const next of [...(needsFrom.get(current) ?? [])].sort(byPosition)) {
      if (cameFrom.has(next)) continue;
      cameFrom.set(next, current);
      queue.push(next);
    }
  }
  if (!cameFrom.has(fromId)) return [];

  // Walk back from fromId to the target: that is already learning order.
  const chain: Topic[] = [];
  for (let id: string | null = fromId; id !== null; id = cameFrom.get(id)!) chain.push(topicById.get(id)!);
  return chain;
}
