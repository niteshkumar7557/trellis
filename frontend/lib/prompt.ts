// Builds the prompt a student takes to their own AI. It is assembled, not generated:
// no AI call. Three parts, each straight from the data (design.md §9):
//   1. known topics — template text filled in from the student's statuses
//   2. experiences — what the student told the helper about this topic
//   3. instructions — fixed lines from the database, by layer
// Every sentence comes from the map or the student's own words; none of it explains the topic.

import { instructions } from "./data/instructions";
import { subjectById, topicById } from "./data";
import { isFooting, needsOf, pastUnlocks, statusOf, suspectsFor } from "./graph";
import type { CheckIn, Experience, Status, Topic } from "./types";

export interface Prompt {
  known: string;
  /** Empty when there is nothing relevant yet. */
  experiences: string[];
  instructions: string[];
  /** The whole prompt, ready to paste. */
  text: string;
  /** The experiences in it, so taking the prompt can count them. */
  experienceIds: string[];
}

const MAX_EXPERIENCES = 4;
/** A bad experience goes into at most this many prompts the student takes, then it is left out. */
export const MAX_HARD_USES = 2;

function list(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** Lowercase the first letter to continue a sentence, but leave "I" and names like "FlatList" alone. */
const lower = (s: string) => (/^(I\b|[A-Z]{2}|[A-Z][a-z]+[A-Z])/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1));

/** Part 2: this topic's own experiences, newest first. A bad one stops after two prompts taken. */
export function experiencesFor(topic: Topic, experiences: Experience[]): Experience[] {
  return experiences
    .filter((e) => e.topicId === topic.id)
    .filter((e) => e.kind !== "hard" || (e.uses ?? 0) < MAX_HARD_USES)
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, MAX_EXPERIENCES);
}

function experienceLine(e: Experience): string {
  const name = topicById.get(e.topicId)?.name ?? "This";
  const line = e.line.replace(/[.\s]+$/, "");
  if (e.kind === "clicked") return `${name} clicked when ${lower(line)}.`;
  if (e.kind === "easy") return `${name} felt easy: ${lower(line)}.`;
  return `${name} was hard: ${lower(line)}.`;
}

export function buildPrompt(topic: Topic, statuses: Map<string, Status>, checkIns: CheckIn[], experiences: Experience[] = []): Prompt {
  const subject = subjectById.get(topic.subjectId)!;
  const status = statusOf(statuses, topic.id);
  const area = topic.parentId ? topicById.get(topic.parentId)!.name : null;
  const where = area ? `${subject.name} (${area})` : subject.name;
  const suspect = status === "stuck" ? suspectsFor(topic.id, statuses)[0] : undefined;

  // ---------------------------------------------------------------- 1. known topics
  const known: string[] = [];
  if (status === "stuck") known.push(`I'm learning ${where} and I'm stuck on ${topic.name}.`);
  else if (status === "learning") known.push(`I'm learning ${where} and I'm partway through ${topic.name}.`);
  else if (status === "done" || status === "know")
    known.push(`I'm learning ${where}. I've covered ${topic.name} and want to check I really understand it, not just recognise it.`);
  else known.push(`I'm learning ${where}. Next I want to learn ${topic.name}: ${lower(topic.summary)}`);

  const pre = needsOf(topic.id).map((id) => ({ t: topicById.get(id)!, s: statusOf(statuses, id) }));
  const solid = pre.filter((p) => isFooting(p.s)).map((p) => p.t.name);
  const shaky = pre.filter((p) => p.s === "shaky" || p.s === "learning" || p.s === "stuck").map((p) => p.t.name);
  const fresh = pre.filter((p) => p.s === "new").map((p) => p.t.name);
  if (solid.length) known.push(`I'm comfortable with ${list(solid)}.`);
  const gapNamed = suspect && (shaky.includes(suspect.topic.name) || fresh.includes(suspect.topic.name));
  if (shaky.length) known.push(`I'm shaky on ${list(shaky)}${gapNamed && shaky.includes(suspect!.topic.name) ? `, and I think ${suspect!.topic.name} is my real gap` : ""}.`);
  if (fresh.length) known.push(`I haven't studied ${list(fresh)} yet${gapNamed && fresh.includes(suspect!.topic.name) ? `, and I think ${suspect!.topic.name} is my real gap` : ""}.`);
  if (suspect && !gapNamed) known.push(`I think my real gap is ${suspect.topic.name}.`);
  if (status === "stuck" && pastUnlocks(checkIns, experiences).length) known.push("Going back one step has worked for me before.");

  // ---------------------------------------------------------------- 2. experiences
  const picked = experiencesFor(topic, experiences);
  const mine = picked.map(experienceLine);

  // ---------------------------------------------------------------- 3. instructions
  const fill = (text: string) => text.replaceAll("{topic}", topic.name).replaceAll("{gap}", suspect?.topic.name ?? "");
  const byStatus = instructions
    .filter((i) => i.scope === "status" && i.status === status)
    .filter((i) => !i.text.includes("{gap}") || suspect)
    .map((i) => fill(i.text));
  const own = [
    ...(topic.mistakes.length ? [`Watch for the usual traps: ${list(topic.mistakes.map(lower))}.`] : []),
    ...instructions.filter((i) => i.scope === "topic" && i.topicId === topic.id).map((i) => fill(i.text)),
  ];
  const base = instructions.filter((i) => i.scope === "base").map((i) => fill(i.text));
  const told = [...byStatus, ...own, ...base];

  const text = [
    known.join(" "),
    ...(mine.length ? ["", "From my own notes:", ...mine.map((l) => `- ${l}`)] : []),
    "",
    "How I'd like you to help:",
    ...told.map((l) => `- ${l}`),
  ].join("\n");

  return { known: known.join(" "), experiences: mine, instructions: told, text, experienceIds: picked.map((e) => e.id) };
}

export function chatGptUrl(prompt: string) {
  return `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`;
}

export function claudeUrl(prompt: string) {
  return `https://claude.ai/new?q=${encodeURIComponent(prompt)}`;
}
