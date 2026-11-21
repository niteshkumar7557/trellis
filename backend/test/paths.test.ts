// findPath against the real topic files. It reads shared/data in memory, so no database.

import { describe, expect, it } from "vitest";
import { topicById, topicsOf } from "@shared/data";
import { findPath } from "../src/repos/graph.repo.js";

const ids = (path: { id: string }[] | null) => path?.map((t) => t.id);

describe("findPath", () => {
  it("returns the chain in learning order", () => {
    expect(ids(findPath("rn-jsx", "rn-state"))).toEqual(["rn-jsx", "rn-components", "rn-state"]);
  });

  it("returns whole topics, not just ids", () => {
    expect(findPath("rn-jsx", "rn-state")?.[1]).toEqual(topicById.get("rn-components"));
  });

  it("returns the shortest chain when there are several", () => {
    // Components → lists in JSX → FlatList → SectionList (4), not through View and ScrollView (5).
    expect(ids(findPath("rn-components", "rn-sectionlist"))).toEqual([
      "rn-components",
      "rn-jsx-lists",
      "rn-flatlist",
      "rn-sectionlist",
    ]);
  });

  it("picks the chain whose topics come first in the files when two are equally short", () => {
    // Modern JavaScript → FlatList runs through lists in JSX or through objects and arrays in
    // state: both three long. Lists in JSX comes first in the React Native file.
    expect(ids(findPath("rn-js-modern", "rn-flatlist"))).toEqual(["rn-js-modern", "rn-jsx-lists", "rn-flatlist"]);
  });

  it("returns [] when the target doesn't stand on the topic, even the other way round", () => {
    expect(findPath("rn-flatlist", "rn-components")).toEqual([]);
  });

  it("returns [] across subjects", () => {
    const redisTopic = topicsOf("redis")[0]!;
    expect(findPath("rn-state", redisTopic.id)).toEqual([]);
  });

  it("returns just the topic when both ids are the same", () => {
    expect(ids(findPath("rn-state", "rn-state"))).toEqual(["rn-state"]);
  });

  it("returns null when either topic doesn't exist", () => {
    expect(findPath("made-up-topic", "rn-state")).toBeNull();
    expect(findPath("rn-state", "made-up-topic")).toBeNull();
  });
});
