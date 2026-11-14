// Part 3 of every prompt: fixed instructions, kept in the database (this file stands in).
// Layers: base lines for every prompt, then lines for the topic's status, then the topic's own.
// A topic's common mistakes are added as a topic line automatically (see shared/prompt.ts).
// {topic} is the topic's name; {gap} is the likely real problem when stuck.
// Reviewed content: change it in a pull request, not in passing.

import type { Instruction } from "../types";

export const instructions: Instruction[] = [
  // ------------------------------------------------------------ every prompt
  { id: "base-steps", scope: "base", text: "Go in small steps, and ask me a question after each one to check I've really got it." },
  { id: "base-examples", scope: "base", text: "Use short examples I can run in my own project." },
  { id: "base-lecture", scope: "base", text: "Don't lecture, and don't give me everything at once." },
  { id: "base-no-reminders", scope: "base", text: "Use my notes to shape how you teach, but don't remind me of past mistakes or of what I found hard. Just make it easier this time." },
  // Gives the student ready words for the helper, written where they just finished
  // learning (design.md §9). Kept last, so it is the last thing the AI reads.
  { id: "base-report-back", scope: "base", text: "When we finish, end with two short lines I can paste back into Trellis: what I understood, and what is still unclear." },

  // ------------------------------------------------------------ by status
  { id: "new-start", scope: "status", status: "new", text: "Start from what I already know, and tell me where {topic} fits." },
  { id: "shaky-check", scope: "status", status: "shaky", text: "I said I was shaky on {topic}, so first find out what I actually know before teaching anything." },
  { id: "learning-resume", scope: "status", status: "learning", text: "Pick up where I stopped. Don't start {topic} from zero." },
  { id: "stuck-gap", scope: "status", status: "stuck", text: "Start with {gap}, briefly, then connect it back to {topic}." },
  { id: "stuck-different", scope: "status", status: "stuck", text: "Explain it a different way from the usual docs; the usual way didn't work for me." },
  { id: "done-quiz", scope: "status", status: "done", text: "Quiz me on {topic} with three questions, hardest last, before explaining anything." },
  { id: "know-quiz", scope: "status", status: "know", text: "I said I know {topic}. Quiz me with three questions to check, before explaining anything." },

  // ------------------------------------------------------------ single topics (extra lines beyond common mistakes)
  { id: "rn-flatlist-run", scope: "topic", topicId: "rn-flatlist", text: "Have me build a list I can add items to, so I can see when it does and doesn't update." },
  { id: "rn-state-why", scope: "topic", topicId: "rn-state", text: "Show me why changing state in place doesn't re-render, with a tiny example." },
  { id: "rd-expire-overwrite", scope: "topic", topicId: "rd-expire", text: "Show me what happens to a key's TTL when it is written again." },
];
