// The graph repo against the real topic files. It reads shared/data in memory, so no database.

import { describe, expect, it } from "vitest";
import { edges, goals, subjects, topicById, topicsOf } from "@shared/data";
import { getSubjectGraph, getSubjects } from "../src/repos/graph.repo.js";

describe("the graph repo", () => {
  it("reads the subjects, in file order", () => {
    expect(getSubjects()).toEqual(subjects);
  });

  it("gives every topic, edge and goal of a subject, in file order, and nothing from another", () => {
    for (const s of subjects) {
      const graph = getSubjectGraph(s.id);
      expect(graph?.topics).toEqual(topicsOf(s.id));
      expect(graph?.edges).toEqual(edges.filter((e) => topicById.get(e.from)?.subjectId === s.id));
      expect(graph?.goals).toEqual(goals.filter((g) => g.subjectId === s.id));
    }
  });

  it("splits the whole graph between the subjects, with nothing lost", () => {
    const graphs = subjects.map((s) => getSubjectGraph(s.id)!);
    expect(graphs.flatMap((g) => g.edges)).toHaveLength(edges.length);
    expect(graphs.flatMap((g) => g.goals)).toHaveLength(goals.length);
  });

  it("gives null for a subject that doesn't exist", () => {
    expect(getSubjectGraph("cobol")).toBeNull();
  });
});
