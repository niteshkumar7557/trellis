// The Cypher that turns a :Topic node `t` into the Topic shape in shared/types.ts.
// Both graph.repo.ts and paths.repo.ts use it, so a Topic always looks the same.
//
//   t { .id, .name }            a "map projection": a map built from a node's properties.
//   [(t)-[:IN]->(big) | big.id] a "pattern comprehension": a list with one item per match.
//   [...][0]                    its first item, or null if the list is empty. That's how a
//                               big topic, which is IN nothing, gets parentId: null.
//
// subjectId and parentId aren't properties on the node: in a graph, they ARE the :OF and
// :IN relationships. `big` and `position` are left out because the Topic shape doesn't have
// them.
//
// This text is pasted into other queries, so its inner names (ofSubject, inBigTopic) must not
// clash with names those queries use. That's why they aren't just `s` and `p`: `p` is the
// usual name for a path, and Cypher would refuse a query that used both.
//
// It's a fixed piece of query text that we wrote, never user input, so building a query with
// it is safe. VALUES from a request must always go in as parameters ($id), never into text.

export const TOPIC_FIELDS = `t {
  .id, .name, .summary, .mistakes, .minutes, .optional, .keywords,
  subjectId: [(t)-[:OF]->(ofSubject) | ofSubject.id][0],
  parentId: [(t)-[:IN]->(inBigTopic) | inBigTopic.id][0]
}`;
