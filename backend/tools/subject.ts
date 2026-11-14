// Prints one subject's curriculum as Trellis sees it, for whoever is writing or reviewing it
// (docs/subject-blueprint.md). Reads shared/data only: no database, nothing written.
//
//   npm run subject -- mongodb                         everything: topics, links, goals, warnings
//   npm run subject -- mongodb --goal mg-schema,mg-agg  the route for a goal that doesn't exist yet
//
// Why a tool and not reading the file: what a student meets is WORKED OUT from the file
// (the big-topic links, what a goal requires, the order of the route), and a reviewer must
// judge the worked-out version. Printing it is the only way to see it without the app.

import { bigTopicsOf, edges, goalsOf, kids, subjectById, topicById, topicsOf } from "@shared/data";
import { depthOf, sortByRoute, summarise } from "@shared/graph";
import type { Goal, SubjectId, Topic } from "@shared/types";

const [subjectId, ...rest] = process.argv.slice(2);
const subject = subjectById.get(subjectId as SubjectId);
if (!subject) {
  console.error(`No subject "${subjectId}". Known: ${[...subjectById.keys()].join(", ")}`);
  process.exit(1);
}
const id = subject.id;
const goalFlag = rest.indexOf("--goal");
const askedTargets = goalFlag >= 0 ? (rest[goalFlag + 1] ?? "").split(",").filter(Boolean) : null;

const name = (t: string) => topicById.get(t)?.name ?? `?${t}`;
const hours = (topics: Topic[]) => (topics.reduce((m, t) => m + t.minutes, 0) / 60).toFixed(1);

/** One goal's route: what it requires, in the order a student meets it. */
function printRoute(goal: Goal) {
  const s = summarise(goal, new Map());
  console.log(`\n## Goal: ${goal.name}  [${goal.targets.join(", ")}]`);
  console.log(`   ${s.route.length} subtopics to learn (~${hours(s.route)} h), ${s.skippable.length} skippable, ${s.areas.length} big topics`);
  let area = "";
  s.route.forEach((t, i) => {
    if (t.parentId !== area) {
      area = t.parentId!;
      console.log(`   ── ${name(area)}`);
    }
    console.log(`   ${String(i + 1).padStart(3)}. ${t.name}${t.optional ? " (optional, but something on the route needs it)" : ""}`);
  });
}

if (askedTargets) {
  const unknown = askedTargets.filter((t) => topicById.get(t)?.subjectId !== id || topicById.get(t)?.parentId);
  if (unknown.length) {
    console.error(`Targets must be big topics in ${id}: ${unknown.join(", ")}`);
    process.exit(1);
  }
  printRoute({ id: "goal-try", subjectId: id, name: "(a goal to try)", blurb: "", targets: askedTargets });
  process.exit(0);
}

const bigs = sortByRoute(bigTopicsOf(id));
const subs = topicsOf(id).filter((t) => t.parentId);
console.log(`# ${subject.name}: ${bigs.length} big topics, ${subs.length} subtopics (${subs.filter((t) => !t.optional).length} core), ~${hours(subs)} h`);

console.log("\n## Big topics, in route order (subtopics: c = core, o = optional; minutes; difficulty)");
for (const b of bigs) {
  const needs = edges.filter((e) => e.from === b.id && e.kind === "needs").map((e) => name(e.to));
  console.log(`\n${b.name}  [${b.id}, ${b.difficulty}, ~${hours(kids(b.id))} h]${needs.length ? `  needs: ${needs.join(", ")}` : "  (a foundation)"}`);
  for (const t of sortByRoute(kids(b.id))) {
    const n = edges.filter((e) => e.from === t.id && e.kind === "needs").map((e) => name(e.to));
    const h = edges.filter((e) => e.from === t.id && e.kind === "helps").map((e) => name(e.to));
    console.log(
      `   ${t.optional ? "o" : "c"} ${t.name} (${t.minutes} min, ${t.difficulty})` +
        (n.length ? `  needs: ${n.join(", ")}` : "") +
        (h.length ? `  helped by: ${h.join(", ")}` : ""),
    );
  }
}

for (const g of goalsOf(id)) printRoute(g);

// Things worth a second look. None of these is an error (the data checks catch errors);
// each is a pattern that made a map or the helper worse in the subjects so far.
console.log("\n## Worth a second look");
const notes: string[] = [];
for (const b of bigs) {
  const inside = kids(b.id);
  if (inside.length > 10) notes.push(`${b.name} has ${inside.length} subtopics (the guide says 2 to 10)`);
  // Subtopics at the same depth inside a frame are drawn side by side.
  const ids = new Set(inside.map((t) => t.id));
  const local = (t: string): number =>
    edges.filter((e) => e.kind === "needs" && e.from === t && ids.has(e.to)).reduce((m, e) => Math.max(m, local(e.to) + 1), 0);
  const rows = new Map<number, number>();
  for (const t of inside) rows.set(local(t.id), (rows.get(local(t.id)) ?? 0) + 1);
  const widest = Math.max(...rows.values());
  if (widest > 6) notes.push(`${b.name} draws ${widest} boxes in one row (over 6 reads badly; split the big topic?)`);
}
const owners = new Map<string, string[]>();
for (const t of subs) for (const k of [t.name.toLowerCase(), ...t.keywords]) owners.set(k, [...(owners.get(k) ?? []), t.id]);
for (const [k, ids] of owners) if (new Set(ids).size > 1) notes.push(`"${k}" points at ${[...new Set(ids)].map(name).join(" and ")}: the helper can't tell them apart`);
for (const t of subs) if (t.minutes > 120) notes.push(`${t.name} is ${t.minutes} min: more than one sitting; split it?`);
for (const t of subs) if (t.name.length > 30) notes.push(`"${t.name}" is ${t.name.length} characters; about 28 fit in a box`);
const deepest = Math.max(...subs.map((t) => depthOf(t.id)));
console.log(notes.length ? notes.map((n) => `- ${n}`).join("\n") : "- nothing");
console.log(`\n(The longest chain of prerequisites is ${deepest + 1} subtopics.)`);
