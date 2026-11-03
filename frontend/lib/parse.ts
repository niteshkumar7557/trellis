// Stand-in for the AI's reading of a message: which topic, and how it went. It matches
// topic names and keywords as whole words, and a few phrases for the outcome. The real
// version calls DeepSeek; the student confirms everything before it is saved either way.

import { bigTopicsOf, subtopicsOf, topicById } from "./data";
import type { Outcome, SubjectId } from "./types";

const STUCK = /(stuck|didn'?t get|don'?t get|do not get|no idea|lost me|confus|makes? no sense|got nowhere|can'?t (get|figure|understand)|cannot|gave up|hard to follow|difficult|difficulty|struggl|hard time|not working|doesn'?t work|isn'?t working|broken)/i;
const PARTLY = /(kind of|kinda|sort of|partly|partially|blurry|halfway|half way|not sure|mostly|bit unclear|still unclear|somewhat|some of it)/i;
const GOT = /\b(finished|completed?|done( with)?|got it|got|learned|learnt|understood|figured (it )?out|makes sense|made sense|did|studied|covered|read|went through|nailed)\b/i;

/** Whole-word match, so "res" does not fire inside "address". */
export function mentions(line: string, keyword: string): boolean {
  const escaped = keyword.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`).test(` ${line.toLowerCase()} `);
}

/** How it went, if the message says. Stuck wins over partly, partly over got. */
export function readOutcome(text: string): Outcome | null {
  if (STUCK.test(text)) return "stuck";
  if (PARTLY.test(text)) return "partly";
  if (GOT.test(text)) return "got";
  return null;
}

export interface Found {
  /** The best subtopic, if any word points at one. */
  topicId: string | null;
  /** Its name was said outright (not just a keyword). */
  named: boolean;
  /** A big topic named in the message. */
  bigId: string | null;
}

/** The topic a message is about, in one subject. */
export function findTopic(text: string, subjectId: SubjectId): Found {
  let best: { id: string; score: number; named: boolean } | null = null;
  for (const t of subtopicsOf(subjectId)) {
    let score = 0;
    const named = mentions(text, t.name);
    if (named) score += t.name.length + 5;
    for (const k of t.keywords) if (mentions(text, k)) score += k.length;
    if (score && (!best || score > best.score)) best = { id: t.id, score, named };
  }
  const big = bigTopicsOf(subjectId)
    .filter((b) => mentions(text, b.name))
    .sort((a, b) => b.name.length - a.name.length)[0];
  return { topicId: best?.id ?? null, named: best?.named ?? false, bigId: big?.id ?? null };
}

/** The part of a message that says why, e.g. "got flatlist, keys confused me" → "keys confused me". */
export function reasonIn(text: string): string | null {
  const m = text.match(/(?:,|;|:|—| - |\bbecause\b|\bbut\b|\bsince\b|\bas\b)\s*(.+)$/i);
  if (!m) return null;
  const rest = m[1].trim();
  return rest.split(/\s+/).length >= 3 ? rest : null;
}

const HARD_WORDS = /(hard|difficult|confus|tricky|struggl|took (me )?(a while|ages|long)|slow|didn'?t get|not sure|unclear|weird|lost)/i;
const CLICK_WORDS = /(clicked|realis|realiz|once i|turned out|the trick|makes sense now|it was just)/i;

/** What kind of experience an answer is, given the question that was asked. */
export function readKind(text: string, asked: "easy" | "hard" | "clicked"): "easy" | "hard" | "clicked" {
  if (asked === "clicked") return "clicked";
  if (asked === "hard") return "hard";
  if (CLICK_WORDS.test(text)) return "clicked";
  return HARD_WORDS.test(text) ? "hard" : "easy";
}

const FILLER = /\b(lol|lmao|idk|tbh|ngl|um+|uh+|like,|basically|honestly|kinda|sorta)\b/gi;

/** A clean one-line version for prompts. (The AI writes this; the stand-in only tidies.) */
export function tidy(text: string): string {
  const t = text.replace(FILLER, " ").replace(/\s+/g, " ").trim().replace(/[\s.!?]+$/, "");
  if (!t) return "";
  // Leave code-like first words alone: "useState", "iOS", "redis-cli".
  const first = t.split(/\s/)[0];
  const keep = /[A-Z]/.test(first.slice(1)) || /[-_./()]/.test(first);
  return `${keep ? t : t.charAt(0).toUpperCase() + t.slice(1)}.`;
}

/** "Not now", "nothing", "skip": the student would rather not answer. */
export const declines = (text: string) =>
  /^(no|nope|nah|nothing|none|skip|pass|not now|later|idk|dunno|n\/a|-)[.!]?$/i.test(text.trim());

export const nameOf = (id: string) => topicById.get(id)?.name ?? id;
