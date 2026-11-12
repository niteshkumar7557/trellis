// findDrift is a pure function, so this needs no database. The graphs are tiny and made by
// hand: a test you can read in one glance is the point.

import { describe, expect, it } from "vitest";
import { findDrift, type GraphLike } from "../src/utils/graph-drift.js";

const graph = (): GraphLike => ({
  topics: [{ id: "a" }, { id: "b" }],
  edges: [{ from: "b", to: "a", kind: "needs" }],
  goals: [{ id: "g" }],
});

describe("findDrift", () => {
  it("finds nothing when both sides match, whatever their order", () => {
    const reordered = graph();
    reordered.topics.reverse();
    expect(findDrift(graph(), reordered)).toEqual([]);
  });

  it("finds a topic missing from either side, and says which side", () => {
    const neo4j = graph();
    neo4j.topics = [{ id: "a" }, { id: "x" }];
    expect(findDrift(neo4j, graph()).sort()).toEqual([
      "topic b is in the files but not in Neo4j",
      "topic x is in Neo4j but not in the files",
    ]);
  });

  it("finds a link missing from either side", () => {
    const neo4j = graph();
    // Same two topics, other kind: a different link, so one missing each way.
    neo4j.edges = [{ from: "b", to: "a", kind: "helps" }];
    expect(findDrift(neo4j, graph()).sort()).toEqual([
      "helps link b → a is in Neo4j but not in the files",
      "needs link b → a is in the files but not in Neo4j",
    ]);
  });

  it("finds a goal missing from either side", () => {
    const neo4j = graph();
    neo4j.goals = [];
    expect(findDrift(neo4j, graph())).toEqual(["goal g is in the files but not in Neo4j"]);
    expect(findDrift(graph(), neo4j)).toEqual(["goal g is in Neo4j but not in the files"]);
  });
});
