// Reading the graph back from a real Neo4j. Run with `npm run test:integration`.

import { afterAll, describe, expect, it } from "vitest";
import { edges, goals, subjects, topicById, topicsOf } from "@shared/data";
import { seedGraph } from "../../src/db/graph-seed.js";
import { closeNeo4j } from "../../src/db/neo4j.js";
import { checkGraph, getSubjectGraph, getSubjects } from "../../src/repos/graph.repo.js";
import { cypher } from "./helpers.js";

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

  it("reads every edge of a subject, in file order", async () => {
    for (const s of subjects) {
      const graph = await getSubjectGraph(s.id);
      expect(graph?.edges).toEqual(edges.filter((e) => topicById.get(e.from)?.subjectId === s.id));
    }
  });

  it("reads every goal of a subject, with its targets in file order", async () => {
    for (const s of subjects) {
      const graph = await getSubjectGraph(s.id);
      expect(graph?.goals).toEqual(goals.filter((g) => g.subjectId === s.id));
    }
  });

  it("reports ok when Neo4j matches the files", async () => {
    expect(await checkGraph()).toEqual({ state: "ok", problems: [] });
  });

  it("reports drift when Neo4j doesn't match, and says what to do", async () => {
    const [link] = await cypher(
      `MATCH (a:Topic)-[r:HELPS]->(b:Topic)
       WITH a, b, r ORDER BY r.position LIMIT 1
       DELETE r
       RETURN a.id AS from, b.id AS to`,
    );
    try {
      const { state, problems } = await checkGraph();
      expect(state).toBe("drift");
      expect(problems[0]).toMatch(/seed:graph/);
      expect(problems).toContain(`helps link ${link.from} → ${link.to} is in the files but not in Neo4j`);
    } finally {
      await seedGraph();
    }
  });
});
