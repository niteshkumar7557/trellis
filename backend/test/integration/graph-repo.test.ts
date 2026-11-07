// Reading the graph back from a real Neo4j. Run with `npm run test:integration`.

import { afterAll, describe, expect, it } from "vitest";
import { subjects, topicsOf } from "@shared/data";
import { closeNeo4j } from "../../src/db/neo4j.js";
import { getSubjectGraph, getSubjects } from "../../src/repos/graph.repo.js";

afterAll(closeNeo4j);

describe("the graph repo", () => {
  it("reads the subjects, in file order", async () => {
    expect(await getSubjects()).toEqual(subjects);
  });

  it("reads every topic of a subject, exactly as the files have it", async () => {
    for (const s of subjects) {
      const graph = await getSubjectGraph(s.id);
      expect(graph?.topics).toEqual(topicsOf(s.id));
    }
  });

  it("gives null for a subject that doesn't exist", async () => {
    expect(await getSubjectGraph("cobol")).toBeNull();
  });

  // ---------------------------------------------------------------- Task B (7 Nov)
  // Remove `.skip` and write each body.

  it.skip("reads every edge of a subject, in file order", async () => {
    // TODO(Task B): for each subject, graph.edges must equal the edges from shared/data
    // whose `from` topic is in that subject. (`edges` and `topicById` are exported there.)
  });

  it.skip("reads every goal of a subject, with its targets in file order", async () => {
    // TODO(Task B): for each subject, graph.goals must equal goals.filter(...) for it.
  });

  it.skip("loads a snapshot that knows every topic, and no made-up one", async () => {
    // TODO(Task B): before loading, topicExists("rn-state") is false. After
    // loadGraphSnapshot(), it's true, and topicExists("rn-made-up") is false.
  });

  it.skip("passes the boot check when Neo4j matches the files", async () => {
    // TODO(Task B): await expect(checkGraphAtBoot()).resolves.toBeUndefined();
  });

  it.skip("fails the boot check when Neo4j doesn't match, and says what to do", async () => {
    // TODO(Task B): delete one real HELPS link with cypher() from ./helpers.js. Expect
    // checkGraphAtBoot() to reject with a message containing "seed:graph" and the link. Finish
    // with await seedGraph(), even if the expect fails: use try/finally.
  });
});
