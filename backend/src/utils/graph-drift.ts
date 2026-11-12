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

/** One line for each item that's on one side only, in both directions. */
function compare(what: string, neo4j: Set<string>, files: Set<string>): string[] {
  const lines: string[] = [];
  for (const item of files) {
    if (!neo4j.has(item)) lines.push(`${what} ${item} is in the files but not in Neo4j`);
  }
  for (const item of neo4j) {
    if (!files.has(item)) lines.push(`${what} ${item} is in Neo4j but not in the files`);
  }
  return lines;
}

const ids = (items: { id: string }[]) => new Set(items.map((i) => i.id));

/**
 * Lists every difference between Neo4j and the files, one readable line each, like
 *   "topic rn-state is in the files but not in Neo4j"
 *   "needs link rn-a → rn-b is in Neo4j but not in the files"
 * Empty means they match. Counts alone wouldn't do: remove one link and add another, and
 * the counts match while the graph is wrong.
 */
export function findDrift(neo4j: GraphLike, files: GraphLike): string[] {
  // A link is its from, to AND kind: a needs and a helps between the same two topics differ.
  const links = (g: GraphLike) => {
    const byKind = new Map<string, Set<string>>();
    for (const e of g.edges) {
      if (!byKind.has(e.kind)) byKind.set(e.kind, new Set());
      byKind.get(e.kind)!.add(`${e.from} → ${e.to}`);
    }
    return byKind;
  };
  const neo4jLinks = links(neo4j);
  const fileLinks = links(files);
  const kinds = new Set([...neo4jLinks.keys(), ...fileLinks.keys()]);

  return [
    ...compare("topic", ids(neo4j.topics), ids(files.topics)),
    ...[...kinds].flatMap((kind) =>
      compare(`${kind} link`, neo4jLinks.get(kind) ?? new Set(), fileLinks.get(kind) ?? new Set()),
    ),
    ...compare("goal", ids(neo4j.goals), ids(files.goals)),
  ];
}
