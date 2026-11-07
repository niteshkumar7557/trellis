// shared/graph.ts works out "next topic" and "why stuck" from the files in shared/data, while
// the API serves the map from Neo4j. If someone edits the files and forgets to reseed, the
// two disagree, and the server would give answers that don't match its own map. This
// compares them, so the server can refuse to start. It's a pure function: no database, so
// it's easy to test.

export interface GraphLike {
  topics: { id: string }[];
  edges: { from: string; to: string; kind: string }[];
  goals: { id: string }[];
}

/**
 * Lists every difference between Neo4j and the files, one readable line each, like
 *   "topic rn-state is in the files but not in Neo4j"
 *   "needs link rn-a → rn-b is in Neo4j but not in the files"
 * Empty means they match.
 *
 * TODO(Task B): compare the topics, the edges and the goals, in both directions.
 */
export function findDrift(_neo4j: GraphLike, _files: GraphLike): string[] {
  return [];
}
