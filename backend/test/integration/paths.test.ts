import { afterAll, describe, it, expect } from "vitest";
import { closeNeo4j } from "../../src/db/neo4j.js";
import { findPath } from "../../src/repos/paths.repo.js";
import { topicById } from "@shared/data";
import { cypher } from "./helpers.js";

afterAll(closeNeo4j);

describe("findPath", () => {
  it("returns the chain in learning order", async () => {
    const result = await findPath("rn-jsx", "rn-state");

    expect(result?.map((topic) => topic.id)).toEqual([
      "rn-jsx",
      "rn-components",
      "rn-state",
    ]);
  });

  it("returns whole topics, not just ids", async () => {
    const result = await findPath("rn-jsx", "rn-state");
    expect(result?.[1]).toEqual(topicById.get("rn-components"));
  });

  it("returns the shortest chain when there are several", async () => {
    // Components → lists in JSX → FlatList → SectionList (4), not through View and ScrollView (5).
    const result = await findPath("rn-components", "rn-sectionlist");

    expect(result?.map((topic) => topic.id)).toEqual(["rn-components", "rn-jsx-lists", "rn-flatlist", "rn-sectionlist"]);
  });

  it("always picks the same chain when two are equally short", async () => {
    // Modern JavaScript → FlatList runs through lists in JSX or through objects and arrays in
    // state: both three long.
    for (let i = 0; i < 10; i++) {
      const result = await findPath("rn-js-modern", "rn-flatlist");

      expect(result?.map((topic) => topic.id)).toEqual(["rn-js-modern", "rn-jsx-lists", "rn-flatlist"]);
    }
  });

  it("returns [] when the target doesn't stand on the topic, even the other way round", async () => {
    const result = await findPath("rn-flatlist", "rn-components");

    expect(result).toEqual([]);
  });

  it("returns [] across subjects", async () => {
    const rows = await cypher(`
      MATCH (t:Topic)-[:OF]->(s:Subject)
      WHERE toLower(s.name) CONTAINS 'redis'
      RETURN t.id AS id
      LIMIT 1
    `);

    expect(rows.length).toBeGreaterThan(0);

    const result = await findPath("rn-state", rows[0].id as string);

    expect(result).toEqual([]);
  });

  it("returns just the topic when both ids are the same", async () => {
    const result = await findPath("rn-state", "rn-state");

    expect(result?.map((topic) => topic.id)).toEqual(["rn-state"]);
  });

  it("returns null when either topic doesn't exist", async () => {
    expect(await findPath("made-up-topic", "rn-state")).toBeNull();
    expect(await findPath("rn-state", "made-up-topic")).toBeNull();
  });
});