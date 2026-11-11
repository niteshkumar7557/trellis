// "What stands between this topic and that one?" This is the query Neo4j is here for.

import type { Topic } from "@shared/types";
import driver from "../db/neo4j.js";
import { TOPIC_FIELDS } from "./topic-fields.js";



/**
 * The chain of prerequisites from one topic to another, in learning order.
 */
export async function findPath(
  fromId: string,
  toId: string
): Promise<Topic[] | null> {

  // 1. Check whether both topics exist.
  const existence = await driver.executeQuery(
    `OPTIONAL MATCH (a:Topic {id: $fromId})
     OPTIONAL MATCH (b:Topic {id: $toId})
     RETURN a IS NOT NULL AS fromExists,
            b IS NOT NULL AS toExists`,
    { fromId, toId },
    { routing: "READ" }
  );

  const row = existence.records[0];

  if (
    !row ||
    !row.get("fromExists") ||
    !row.get("toExists")
  ) {
    return null;
  }

  // 2. If both IDs are the same, return that topic.
  if (fromId === toId) {
    const result = await driver.executeQuery(
      `MATCH (t:Topic {id: $id})
       RETURN ${TOPIC_FIELDS} AS topic`,
      { id: fromId },
      { routing: "READ" }
    );

    return result.records.map(
      (r: { get(key: string): unknown }) => r.get("topic") as Topic
    );
  }

  // 3. Find all shortest prerequisite paths.
  // NEEDS points from a dependent topic to its prerequisite.
  const result = await driver.executeQuery(
    `MATCH (target:Topic {id: $toId}),
           (source:Topic {id: $fromId})
     MATCH p = allShortestPaths((target)-[:NEEDS*]->(source))

     WITH p
     ORDER BY [n IN nodes(p) | n.position]
     LIMIT 1

     // Reverse the path to get learning order.
     WITH reverse(nodes(p)) AS learningNodes

     UNWIND range(0, size(learningNodes) - 1) AS i
     WITH learningNodes[i] AS t, i

     RETURN ${TOPIC_FIELDS} AS topic
     ORDER BY i`,
    { fromId, toId },
    { routing: "READ" }
  );

  // 4. Both topics exist, but no prerequisite path connects them.
  if (result.records.length === 0) {
    return [];
  }

  // 5. Return topics in learning order.
  return result.records.map(
    (r: { get(key: string): unknown }) => r.get("topic") as Topic
  );
}