// "What stands between this topic and that one?" This is the query Neo4j is here for: a
// path of unknown length through NEEDS, which in SQL would take a recursive query.

import type { Topic } from "@shared/types";
import driver from "../db/neo4j.js";
import { TOPIC_FIELDS } from "./topic-fields.js";

/**
 * The chain of prerequisites from one topic up to another, in LEARNING order: `fromId` first,
 * `toId` last, so read it top to bottom as "study this, then this, then this".
 *
 *   findPath("rn-components", "rn-flatlist") → [Components, Props, FlatList]
 *
 * Returns:
 *   - the topics of the SHORTEST chain, if there's more than one. If several are equally
 *     short, always the same one: the first when sorted by each topic's `position`, starting
 *     from toId. (rn-flatlist can go through rn-props or rn-state; Props comes first.)
 *   - [] if both topics exist but `toId` doesn't stand on `fromId`;
 *   - [the topic] if fromId and toId are the same topic;
 *   - null if either topic doesn't exist (the controller turns that into a 404).
 */
export async function findPath(fromId: string, toId: string): Promise<Topic[] | null> {
  // First: do both exist? The path query alone can't tell "no such topic" from "not
  // connected". With the same id twice, one row is enough.
  const found = await driver.executeQuery(
    `MATCH (t:Topic) WHERE t.id IN [$fromId, $toId]
     RETURN ${TOPIC_FIELDS} AS topic`,
    { fromId, toId },
    { routing: "READ" },
  );
  const expected = fromId === toId ? 1 : 2;
  if (found.records.length < expected) return null;

  // shortestPath throws when the start and end are the same node.
  if (fromId === toId) return [found.records[0].get("topic") as Topic];

  // NEEDS points from dependent to prerequisite, so the path is matched DOWN from the target
  // and reversed afterwards. allShortestPaths gives every shortest path; sorting by the list
  // of positions (compared item by item) and keeping the first makes the answer the same on
  // every call.
  const { records } = await driver.executeQuery(
    `MATCH (target:Topic {id: $toId}), (start:Topic {id: $fromId})
     MATCH p = allShortestPaths((target)-[:NEEDS*]->(start))
     WITH p ORDER BY [n IN nodes(p) | n.position] LIMIT 1
     UNWIND reverse(nodes(p)) AS t
     RETURN ${TOPIC_FIELDS} AS topic`,
    { fromId, toId },
    { routing: "READ" },
  );
  return records.map((r) => r.get("topic") as Topic);
}
