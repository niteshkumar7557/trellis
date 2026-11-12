// Copies the topic graph from the reviewed files in shared/data into Neo4j.
//
//   (:Subject {id, name, shortName, blurb, position})
//   (:Topic {id, name, summary, minutes, optional, big, keywords, mistakes, position})-[:OF]->(:Subject)
//   (:Topic)-[:IN]->(:Topic)                  subtopic in its big topic
//   (:Topic)-[:NEEDS {position}]->(:Topic)    from dependent to prerequisite
//   (:Topic)-[:HELPS {position}]->(:Topic)
//   (:Goal {id, name, blurb, position})-[:FOR]->(:Subject)
//   (:Goal)-[:TARGETS {position}]->(:Topic)
//
// The files are the truth; Neo4j is a copy. So the seed must be safe to run any number of
// times, and after every run Neo4j must match the files exactly.
//
// Three ideas this file relies on:
//   - MERGE means "find this, or create it if it isn't there". Run twice, it creates once.
//     (CREATE would make duplicates.) SET then updates the properties either way.
//   - UNWIND $rows turns a list into one row per item, so one query sends every topic in a
//     single round trip instead of 227 of them.
//   - A database has no idea what order the files listed things in, and the map depends on
//     that order. So each thing stores its `position` in the file, and reads sort by it.
//
// Why toInteger(): every JavaScript number travels to Neo4j as a float, so 42 would be stored
// as 42.0. Whole numbers should be stored as whole numbers.

import type { ManagedTransaction, Session } from "neo4j-driver";
import { edges, goals, subjects, topics } from "@shared/data";
import driver from "./neo4j.js";

/** How many of each thing are in Neo4j. Relationships are counted by type. */
export interface GraphCounts {
  subjects: number;
  topics: number;
  goals: number;
  of: number;
  in: number;
  needs: number;
  helps: number;
  for: number;
  targets: number;
}

/** What the counts must be if Neo4j matches the files in shared/data. */
export const expectedCounts: GraphCounts = {
  subjects: subjects.length,
  topics: topics.length,
  goals: goals.length,
  of: topics.length, // every topic belongs to one subject
  in: topics.filter((t) => t.parentId !== null).length, // every subtopic is in one big topic
  needs: edges.filter((e) => e.kind === "needs").length,
  helps: edges.filter((e) => e.kind === "helps").length,
  for: goals.length, // every goal is for one subject
  targets: goals.reduce((sum, g) => sum + g.targets.length, 0),
};

// ---------------------------------------------------------------- writing the content

async function writeSubjects(tx: ManagedTransaction) {
  await tx.run(
    `UNWIND $rows AS row
     MERGE (s:Subject {id: row.id})
     SET s.name = row.name, s.shortName = row.shortName, s.blurb = row.blurb,
         s.position = toInteger(row.position)`,
    { rows: subjects.map((s, position) => ({ ...s, position })) },
  );
}

async function writeTopics(tx: ManagedTransaction) {
  await tx.run(
    `UNWIND $rows AS row
     MERGE (t:Topic {id: row.id})
     SET t.name = row.name, t.summary = row.summary, t.minutes = toInteger(row.minutes),
         t.optional = row.optional, t.big = row.big, t.keywords = row.keywords,
         t.mistakes = row.mistakes, t.position = toInteger(row.position)
     WITH t, row
     MATCH (s:Subject {id: row.subjectId})
     MERGE (t)-[:OF]->(s)`,
    { rows: topics.map((t, position) => ({ ...t, big: t.parentId === null, position })) },
  );

  // A second query, because it needs every topic to exist already, whatever order the files
  // list them in.
  await tx.run(
    `UNWIND $rows AS row
     MATCH (t:Topic {id: row.id}), (parent:Topic {id: row.parentId})
     MERGE (t)-[:IN]->(parent)`,
    { rows: topics.filter((t) => t.parentId !== null) },
  );
}

async function writeLinks(tx: ManagedTransaction) {
  const rows = edges.map((e, position) => ({ ...e, position }));
  // Two queries, not one with a parameter: Cypher can't take a relationship TYPE as a
  // parameter. Only values can be parameters, never the shape of the query.
  await tx.run(
    `UNWIND $rows AS row
     MATCH (a:Topic {id: row.from}), (b:Topic {id: row.to})
     MERGE (a)-[r:NEEDS]->(b)
     SET r.position = toInteger(row.position)`,
    { rows: rows.filter((r) => r.kind === "needs") },
  );
  await tx.run(
    `UNWIND $rows AS row
     MATCH (a:Topic {id: row.from}), (b:Topic {id: row.to})
     MERGE (a)-[r:HELPS]->(b)
     SET r.position = toInteger(row.position)`,
    { rows: rows.filter((r) => r.kind === "helps") },
  );
}

async function writeGoals(tx: ManagedTransaction) {
  await tx.run(
    `UNWIND $rows AS row
     MERGE (g:Goal {id: row.id})
     SET g.name = row.name, g.blurb = row.blurb, g.position = toInteger(row.position)
     WITH g, row
     MATCH (s:Subject {id: row.subjectId})
     MERGE (g)-[:FOR]->(s)
     WITH g, row
     UNWIND range(0, size(row.targets) - 1) AS i
     MATCH (t:Topic {id: row.targets[i]})
     MERGE (g)-[r:TARGETS]->(t)
     SET r.position = i`,
    { rows: goals.map((g, position) => ({ ...g, position })) },
  );
}

// ---------------------------------------------------------------- Task A (7 Nov) fills in

/**
 * TODO(Task A): make each of Subject.id, Topic.id and Goal.id unique, using three
 * `CREATE CONSTRAINT <name> IF NOT EXISTS ...` statements, run with session.run().
 */
async function ensureConstraints(session: Session) {
  await session.run("CREATE CONSTRAINT subject_id IF NOT EXISTS FOR (s:Subject) REQUIRE s.id IS UNIQUE");
  await session.run("CREATE CONSTRAINT topic_id IF NOT EXISTS FOR (t:Topic) REQUIRE t.id IS UNIQUE");
  await session.run("CREATE CONSTRAINT goal_id IF NOT EXISTS FOR (g:Goal) REQUIRE g.id IS UNIQUE");
}

/**
 * TODO(Task A): delete what is in Neo4j but no longer in the files:
 *   1. Subject, Topic and Goal nodes whose id isn't in the files, with their relationships.
 *   2. Relationships between surviving nodes that the files no longer contain.
 * Only touch those three labels: never anything else that may be in the database.
 */
async function removeStale(tx: ManagedTransaction) {
  const ids = [...subjects, ...topics, ...goals].map((n) => n.id);
  await tx.run(
    `MATCH (n)
     WHERE (n:Subject OR n:Topic OR n:Goal) AND NOT n.id IN $ids
     DETACH DELETE n`,
    { ids },
  );

  const links = [
    ...topics.map((t) => `${t.id}|OF|${t.subjectId}`),
    ...topics.filter((t) => t.parentId !== null).map((t) => `${t.id}|IN|${t.parentId}`),
    ...edges.map((e) => `${e.from}|${e.kind.toUpperCase()}|${e.to}`),
    ...goals.map((g) => `${g.id}|FOR|${g.subjectId}`),
    ...goals.flatMap((g) => g.targets.map((id) => `${g.id}|TARGETS|${id}`)),
  ];
  await tx.run(
    `MATCH (a)-[r]->(b)
     WHERE (a:Subject OR a:Topic OR a:Goal)
       AND (b:Subject OR b:Topic OR b:Goal)
       AND NOT (a.id + "|" + type(r) + "|" + b.id) IN $links
     DELETE r`,
    { links },
  );
}

/**
 * TODO(Task A): throw an Error if `actual` differs from `expected` in any field, naming each
 * field that differs with both numbers, e.g. "needs: expected 222, found 221".
 */
export function assertCounts(actual: GraphCounts, expected: GraphCounts) {
  const differences = (Object.keys(expected) as (keyof GraphCounts)[])
    .filter((key) => actual[key] !== expected[key])
    .map((key) => `${key}: expected ${expected[key]}, found ${actual[key]}`);
  if (differences.length > 0) {
    throw new Error(`Graph counts differ: ${differences.join("; ")}`);
  }
}

// ---------------------------------------------------------------- the seed itself

async function countGraph(session: Session): Promise<GraphCounts> {
  const result = await session.run(
    `CALL { MATCH (n:Subject) RETURN count(n) AS subjects }
     CALL { MATCH (n:Topic) RETURN count(n) AS topics }
     CALL { MATCH (n:Goal) RETURN count(n) AS goals }
     CALL { MATCH (:Topic)-[r:OF]->(:Subject) RETURN count(r) AS of }
     CALL { MATCH (:Topic)-[r:IN]->(:Topic) RETURN count(r) AS in }
     CALL { MATCH (:Topic)-[r:NEEDS]->(:Topic) RETURN count(r) AS needs }
     CALL { MATCH (:Topic)-[r:HELPS]->(:Topic) RETURN count(r) AS helps }
     CALL { MATCH (:Goal)-[r:FOR]->(:Subject) RETURN count(r) AS for }
     CALL { MATCH (:Goal)-[r:TARGETS]->(:Topic) RETURN count(r) AS targets }
     RETURN subjects, topics, goals, of, in, needs, helps, for, targets`,
  );
  return result.records[0]!.toObject() as GraphCounts;
}

/** Makes Neo4j match the files, and returns the counts it ended up with. */
export async function seedGraph(): Promise<GraphCounts> {
  const session = driver.session();
  try {
    // Separate from what follows: Neo4j refuses to change the schema (constraints) and the
    // data in the same transaction.
    await ensureConstraints(session);

    // One transaction: if any step fails, none of it is kept, so a failed seed can't leave
    // half a graph behind. executeWrite also retries on a passing failure, which is safe
    // because everything inside is idempotent.
    await session.executeWrite(async (tx) => {
      await writeSubjects(tx);
      await writeTopics(tx);
      await writeLinks(tx);
      await writeGoals(tx);
      await removeStale(tx);
    });

    const counts = await countGraph(session);
    assertCounts(counts, expectedCounts);
    return counts;
  } finally {
    await session.close();
  }
}
