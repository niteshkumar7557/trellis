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

  // ---------------------------------------------------------------- Task A (7 Nov)
  // Remove `.skip` and write each body. Whatever a test adds to the database, it must also
  // leave the database clean: end with `await seedGraph()`.

  it.skip("is idempotent: a second run changes nothing", async () => {
    // TODO(Task A): seed twice, and expect the same counts both times.
  });

  it.skip("removes a topic that's no longer in the files, with its relationships", async () => {
    // TODO(Task A): create a :Topic with a made-up id, linked with :NEEDS to a real topic.
    // Seed. Expect that id to be gone, and the real topic to still be there.
  });

  it.skip("removes a link that's no longer in the files, but keeps both topics", async () => {
    // TODO(Task A): create a :HELPS between two REAL topics that don't have one in the
    // files. Seed. Expect the link gone and both topics still there.
  });

  it.skip("doesn't touch nodes that aren't ours", async () => {
    // TODO(Task A): MERGE a node with a different label, e.g. (:Scratch {id: "x"}). Seed.
    // Expect it to still exist. Delete it in a `finally`, so that a failed run can't leave it
    // behind for the next run to trip over.
  });

  it.skip("refuses a second topic with the same id", async () => {
    // TODO(Task A): expect CREATE (:Topic {id: "rn-state"}) to reject, because of the
    // constraint. Use: await expect(cypher(...)).rejects.toThrow(/already exists/);
  });
});
