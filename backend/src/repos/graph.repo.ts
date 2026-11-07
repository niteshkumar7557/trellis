// Reads the topic graph from Neo4j. Nothing outside src/repos/ and src/db/ knows which
// database holds the graph, or writes Cypher.
//
// driver.executeQuery() is the driver's simple API: it borrows a connection, runs one query
// in its own transaction, retries on a passing failure, and returns { records }. For more
// than one query in a transaction you'd use a session, as graph-seed.ts does.
// routing: "READ" says this query only reads; on a cluster it could go to any copy.

import type { Edge, Goal, Subject, Topic } from "@shared/types";
import driver from "../db/neo4j.js";
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

  // TODO(Task B): read this subject's edges and goals the same way, in file order.
  //   Edge: { from, to, kind: "needs" | "helps" }
  //   Goal: { id, subjectId, name, blurb, targets: string[] }, targets in file order too
  const edges: Edge[] = [];
  const goals: Goal[] = [];

  return { topics, edges, goals };
}

// ---------------------------------------------------------------- Task B (7 Nov) fills in

/**
 * TODO(Task B): load every subject's graph into memory (remember it in this module), so
 * later milestones can check a topic id without a database round trip.
 */
export async function loadGraphSnapshot(): Promise<SubjectGraph> {
  return { topics: [], edges: [], goals: [] };
}

/** TODO(Task B): is this a topic in the snapshot? False if nothing has been loaded yet. */
export function topicExists(_topicId: string): boolean {
  return false;
}

/**
 * TODO(Task B): load the snapshot, compare it with the files using findDrift(), and throw
 * an Error that lists the differences and tells the reader to run `npm run seed:graph`.
 */
export async function checkGraphAtBoot(): Promise<void> {}
