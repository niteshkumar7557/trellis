// Reads the topic graph from Neo4j. Nothing outside src/repos/ and src/db/ knows which
// database holds the graph, or writes Cypher.
//
// driver.executeQuery() is the driver's simple API: it borrows a connection, runs one query
// in its own transaction, retries on a passing failure, and returns { records }. For more
// than one query in a transaction you'd use a session, as graph-seed.ts does.
// routing: "READ" says this query only reads; on a cluster it could go to any copy.

import type { Edge, Goal, Subject, Topic } from "@shared/types";
// Renamed on import: getSubjectGraph has local variables called topics, edges and goals.
import { edges as fileEdges, goals as fileGoals, topics as fileTopics } from "@shared/data";
import driver from "../db/neo4j.js";
import { findDrift } from "../utils/graph-drift.js";
import { TOPIC_FIELDS } from "./topic-fields.js";

export interface SubjectGraph {
  topics: Topic[];
  edges: Edge[];
  goals: Goal[];
}

export async function getSubjects(): Promise<Subject[]> {
  const { records } = await driver.executeQuery(
    `MATCH (s:Subject)
     RETURN s { .id, .name, .shortName, .blurb } AS subject
     ORDER BY s.position`,
    {},
    { routing: "READ" },
  );
  return records.map((r) => r.get("subject") as Subject);
}

/** One subject's whole map, in the order the files list it. Null if there's no such subject. */
export async function getSubjectGraph(subjectId: string): Promise<SubjectGraph | null> {
  const { records } = await driver.executeQuery(
    `MATCH (t:Topic)-[:OF]->(:Subject {id: $subjectId})
     RETURN ${TOPIC_FIELDS} AS topic
     ORDER BY t.position`,
    { subjectId },
    { routing: "READ" },
  );
  const topics = records.map((r) => r.get("topic") as Topic);

  // Every subject has topics, so none means no such subject.
  if (topics.length === 0) return null;

  // Edges: tied to the subject through the `from` topic's :OF line, or every request would
  // get both subjects' edges. type(r) is "NEEDS" or "HELPS"; the API uses lowercase.
  const edgeResult = await driver.executeQuery(
    `MATCH (a:Topic)-[:OF]->(:Subject {id: $subjectId})
     MATCH (a)-[r:NEEDS|HELPS]->(b:Topic)
     RETURN a.id AS from, b.id AS to, toLower(type(r)) AS kind
     ORDER BY r.position`,
    { subjectId },
    { routing: "READ" },
  );
  const edges = edgeResult.records.map((r) => r.toObject() as Edge);

  // Goals: sort the TARGETS rows BEFORE collect(), so each list is built in file order.
  // Cypher has no GROUP BY: returning g next to collect() makes one row per goal.
  const goalResult = await driver.executeQuery(
    `MATCH (g:Goal)-[:FOR]->(:Subject {id: $subjectId})
     MATCH (g)-[r:TARGETS]->(t:Topic)
     WITH g, t ORDER BY r.position
     WITH g, collect(t.id) AS targets
     RETURN g { .id, subjectId: $subjectId, .name, .blurb, targets: targets } AS goal
     ORDER BY g.position`,
    { subjectId },
    { routing: "READ" },
  );
  const goals = goalResult.records.map((r) => r.get("goal") as Goal);

  return { topics, edges, goals };
}

// ---------------------------------------------------------------- the health check

/** Every subject's graph in one, as Neo4j holds it. */
export async function loadGraphSnapshot(): Promise<SubjectGraph> {
  const subjects = await getSubjects();
  const graphs = await Promise.all(subjects.map((s) => getSubjectGraph(s.id)));
  const snapshot: SubjectGraph = { topics: [], edges: [], goals: [] };
  for (const g of graphs) {
    if (!g) continue;
    snapshot.topics.push(...g.topics);
    snapshot.edges.push(...g.edges);
    snapshot.goals.push(...g.goals);
  }
  return snapshot;
}

/**
 * "ok": reachable and the same as shared/data.
 * "down": can't be reached (not running, wrong password, ...).
 * "drift": reachable, but different from the files: someone changed shared/data and
 *   didn't run `npm run seed:graph`. Serving it would show a map that disagrees with the
 *   answers shared/graph.ts computes from the files.
 */
export type GraphState = "ok" | "down" | "drift";

/** Never throws: the answer is the state, plus lines saying what is wrong, for the log. */
export async function checkGraph(): Promise<{ state: GraphState; problems: string[] }> {
  let snapshot: SubjectGraph;
  try {
    await driver.verifyConnectivity();
    snapshot = await loadGraphSnapshot();
  } catch (err) {
    return { state: "down", problems: [err instanceof Error ? err.message : String(err)] };
  }
  const drift = findDrift(snapshot, { topics: fileTopics, edges: fileEdges, goals: fileGoals });
  if (drift.length > 0) {
    return { state: "drift", problems: ["Run `npm run seed:graph`.", ...drift] };
  }
  return { state: "ok", problems: [] };
}
