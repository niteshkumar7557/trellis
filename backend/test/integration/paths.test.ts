// The prerequisite-path query, against a real Neo4j. Run with `npm run test:integration`.

import { afterAll, describe, expect, it } from "vitest";
import { topicById } from "@shared/data";
import { closeNeo4j } from "../../src/db/neo4j.js";
import { findPath } from "../../src/repos/paths.repo.js";

afterAll(closeNeo4j);

const idsOf = async (fromId: string, toId: string) =>
  (await findPath(fromId, toId))?.map((t) => t.id);

describe("findPath", () => {
  it("returns the chain in learning order", async () => {
    expect(await idsOf("rn-js", "rn-jsx")).toEqual(["rn-js", "rn-jsx"]);
    expect(await idsOf("rn-jsx", "rn-state")).toEqual(["rn-jsx", "rn-components", "rn-state"]);
  });

  it("returns whole topics, not just ids", async () => {
    const path = await findPath("rn-jsx", "rn-state");
    expect(path?.[1]).toEqual(topicById.get("rn-components"));
  });

  it("returns the shortest chain when there are several", async () => {
    // rn-js reaches rn-websockets in 2 steps or in 5; 2 steps join 3 topics.
    expect(await findPath("rn-js", "rn-websockets")).toHaveLength(3);
  });

  it("always picks the same chain when two are equally short", async () => {
    // Through rn-props or rn-state, both 2 steps: Props comes first in the file.
    for (let i = 0; i < 10; i++) {
      expect(await idsOf("rn-components", "rn-flatlist")).toEqual([
        "rn-components",
        "rn-props",
        "rn-flatlist",
      ]);
    }
  });

  it("returns [] when the target doesn't stand on the topic, even the other way round", async () => {
    expect(await findPath("rn-flatlist", "rn-components")).toEqual([]);
  });

  it("returns [] across subjects", async () => {
    expect(await findPath("rn-state", "rd-strings")).toEqual([]);
  });

  it("returns just the topic when both ids are the same", async () => {
    expect(await findPath("rn-state", "rn-state")).toEqual([topicById.get("rn-state")]);
  });

  it("returns null when either topic doesn't exist", async () => {
    expect(await findPath("rn-made-up", "rn-state")).toBeNull();
    expect(await findPath("rn-state", "rn-made-up")).toBeNull();
  });
});
