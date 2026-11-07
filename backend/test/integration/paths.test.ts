// The prerequisite-path query, against a real Neo4j. Run with `npm run test:integration`.

import { afterAll, describe, it } from "vitest";
import { closeNeo4j } from "../../src/db/neo4j.js";

afterAll(closeNeo4j);

// ---------------------------------------------------------------- Task C (7 Nov)
// Remove `.skip`, import findPath from "../../src/repos/paths.repo.js", and write each body.
describe("findPath", () => {
  it.skip("returns the chain in learning order", async () => {
    // TODO(Task C): rn-js to rn-jsx is a single step. rn-jsx to rn-state goes through
    // rn-components. Expect the ids in learning order: ["rn-jsx", "rn-components", "rn-state"]
  });

  it.skip("returns whole topics, not just ids", async () => {
    // TODO(Task C): take a topic from that chain, and expect it to toEqual the same topic
    // from topicById in @shared/data.
  });

  it.skip("returns the shortest chain when there are several", async () => {
    // TODO(Task C): rn-js to rn-websockets has a route of 2 steps and one of 5. Expect 3
    // topics back (2 steps join 3 topics).
  });

  it.skip("always picks the same chain when two are equally short", async () => {
    // TODO(Task C): rn-components to rn-flatlist can go through rn-props or rn-state, both 2
    // steps. Expect ["rn-components", "rn-props", "rn-flatlist"], ten times in a row.
  });

  it.skip("returns [] when the target doesn't stand on the topic, even the other way round", async () => {
    // TODO(Task C): rn-flatlist to rn-components is the wrong direction, so [].
  });

  it.skip("returns [] across subjects", async () => {
    // TODO(Task C): a React Native topic to a Redis one. Both exist; no chain joins them.
  });

  it.skip("returns just the topic when both ids are the same", async () => {
    // TODO(Task C): rn-state to rn-state gives one topic. (shortestPath alone throws here.)
  });

  it.skip("returns null when either topic doesn't exist", async () => {
    // TODO(Task C): test the made-up id in each position.
  });
});
