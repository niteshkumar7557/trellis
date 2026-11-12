// The graph seed, against a real Neo4j. Run with `npm run test:integration`.

import { afterAll, describe, expect, it } from "vitest";
import { expectedCounts, seedGraph } from "../../src/db/graph-seed.js";
import { closeNeo4j } from "../../src/db/neo4j.js";
import { cypher } from "./helpers.js";

afterAll(closeNeo4j);

describe("the graph seed", () => {
  it("writes every subject, topic, link and goal in the files", async () => {
    expect(await seedGraph()).toEqual(expectedCounts);
  });

  it("gives a subtopic its big topic, and a big topic none", async () => {
    const [flatList] = await cypher(`MATCH (:Topic {id: "rn-flatlist"})-[:IN]->(p) RETURN p.id AS parent`);
    expect(flatList?.parent).toBe("rn-lists");
    expect(await cypher(`MATCH (:Topic {id: "rn-lists"})-[:IN]->(p) RETURN p`)).toEqual([]);
  });

  it("is idempotent: a second run changes nothing", async () => {
    expect(await seedGraph()).toEqual(expectedCounts);
    expect(await seedGraph()).toEqual(expectedCounts);
  });

  it("removes a topic that's no longer in the files, with its relationships", async () => {
    try {
      await cypher(`MERGE (junk:Topic {id: "task-a-stale"})
        WITH junk MATCH (real:Topic {id: "rn-state"}) MERGE (junk)-[:NEEDS]->(real)`);
      await seedGraph();
      expect(await cypher(`MATCH (n:Topic {id: "task-a-stale"}) RETURN n`)).toEqual([]);
      expect(await cypher(`MATCH (n:Topic {id: "rn-state"}) RETURN n.id AS id`))
        .toEqual([{ id: "rn-state" }]);
    } finally {
      await cypher(`MATCH (n:Topic {id: "task-a-stale"}) DETACH DELETE n`);
      await seedGraph();
    }
  });

  it("removes a link that's no longer in the files, but keeps both topics", async () => {
    try {
      await cypher(`MATCH (a:Topic {id: "rn-state"}), (b:Topic {id: "rd-expire"})
        MERGE (a)-[:HELPS]->(b)`);
      await seedGraph();
      expect(await cypher(`MATCH (:Topic {id: "rn-state"})-[r:HELPS]->(:Topic {id: "rd-expire"}) RETURN r`))
        .toEqual([]);
      expect(await cypher(`MATCH (n:Topic) WHERE n.id IN ["rn-state", "rd-expire"]
        RETURN n.id AS id ORDER BY id`)).toEqual([{ id: "rd-expire" }, { id: "rn-state" }]);
    } finally {
      await cypher(`MATCH (:Topic {id: "rn-state"})-[r:HELPS]->(:Topic {id: "rd-expire"}) DELETE r`);
      await seedGraph();
    }
  });

  it("doesn't touch nodes that aren't ours", async () => {
    try {
      await cypher(`MERGE (:Scratch {id: "task-a-scratch"})`);
      await seedGraph();
      expect(await cypher(`MATCH (n:Scratch {id: "task-a-scratch"}) RETURN n.id AS id`))
        .toEqual([{ id: "task-a-scratch" }]);
    } finally {
      await cypher(`MATCH (n:Scratch {id: "task-a-scratch"}) DETACH DELETE n`);
      await seedGraph();
    }
  });

  it("refuses a second topic with the same id", async () => {
    try {
      await expect(cypher(`CREATE (:Topic {id: "rn-state"})`)).rejects.toThrow(/already exists/);
    } finally {
      // Also recover if the constraint is deliberately removed for the break-it check.
      await cypher(`MATCH (n:Topic {id: "rn-state"})
        WITH n ORDER BY elementId(n) WITH collect(n) AS nodes
        UNWIND tail(nodes) AS duplicate DETACH DELETE duplicate`);
      await seedGraph();
    }
  });
});
