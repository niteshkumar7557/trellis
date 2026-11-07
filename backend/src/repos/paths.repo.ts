// "What stands between this topic and that one?" This is the query Neo4j is here for: a
// path of unknown length through NEEDS, which in SQL would take a recursive query.

import type { Topic } from "@shared/types";

/**
 * The chain of prerequisites from one topic up to another, in LEARNING order: `fromId` first,
 * `toId` last, so read it top to bottom as "study this, then this, then this".
 *
 *   findPath("rn-components", "rn-flatlist") → [Components, Props, FlatList]
 *
 * Returns:
 *   - the topics of the SHORTEST chain, if there's more than one. If several are equally
 *     short, always the same one: the first when sorted by each topic's `position`, starting
 *     from toId. (rn-flatlist can go through rn-props or rn-state; Props comes first.)
 *   - [] if both topics exist but `toId` doesn't stand on `fromId`;
 *   - [the topic] if fromId and toId are the same topic;
 *   - null if either topic doesn't exist (the controller turns that into a 404).
 *
 * TODO(Task C): write it. Each returned topic must have the full Topic shape: use
 * TOPIC_FIELDS from ./topic-fields.js.
 */
export async function findPath(_fromId: string, _toId: string): Promise<Topic[] | null> {
  return null;
}
