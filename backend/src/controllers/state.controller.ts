// The whole record at once: GET /api/state (to load the app) and GET /api/export (the
// student's copy of everything Trellis holds about them).

import { subjects } from "@shared/data";
import type { ChatMessage, SubjectId } from "@shared/types";
import type { Request, Response } from "express";
import { readSnapshot } from "../db/index.js";
import { currentUserId } from "../middlewares/auth.middleware.js";
import { listMessages } from "../repos/chat.repo.js";
import { listCheckIns } from "../repos/check-ins.repo.js";
import { listClaims } from "../repos/claims.repo.js";
import { listExperiences } from "../repos/experiences.repo.js";
import { listOpened } from "../repos/opened.repo.js";
import { listPromptTakes } from "../repos/prompt-takes.repo.js";
import { listSubjectRequests } from "../repos/subject-requests.repo.js";
import { getAccountForExport, getStudent } from "../repos/users.repo.js";
import { HttpError } from "../utils/http-error.js";
import { usageFor } from "./usage.controller.js";

// Chat history is the one part of the record that grows without limit, so it alone is
// paged (older pages come from GET /api/helper/:subjectId/messages in M4). 50 messages is
// several sessions' worth. 20 prompt takes is far more than the 14-day "how did it go?"
// rule needs.
const MESSAGES_PER_SUBJECT = 50;
const PROMPT_TAKES = 20;

const gone = () => new HttpError(404, "not_found", "This account no longer exists.");

/**
 * GET /api/state → { student, goalIds, claims, checkIns, experiences, opened,
 *                    promptTakes, messages, moreMessages, usage }
 *
 * Shaped like the frontend store's state (frontend/lib/store.tsx), so loading it is one
 * request and one assignment. Statuses, next topic and the rest are NOT here: the frontend
 * works them out from this with shared/graph.ts, as the backend does.
 */
export async function showState(req: Request, res: Response) {
  const userId = currentUserId(req);
  const state = await readSnapshot(async (db) => {
    const student = await getStudent(userId, db);
    if (!student) return null;

    const messages: ChatMessage[] = [];
    const moreMessages: Partial<Record<SubjectId, boolean>> = {};
    for (const s of subjects) {
      const page = await listMessages(userId, s.id, MESSAGES_PER_SUBJECT, db);
      messages.push(...page.messages);
      moreMessages[s.id] = page.more;
    }
    // The store keeps every subject's messages in one list, oldest first.
    messages.sort((a, b) => a.at.localeCompare(b.at));

    return {
      student,
      goalIds: Object.fromEntries(student.goals.map((g) => [g.subjectId, g.goalId])),
      claims: await listClaims(userId, db),
      checkIns: await listCheckIns(userId, db),
      experiences: await listExperiences(userId, db),
      opened: await listOpened(userId, db),
      promptTakes: await listPromptTakes(userId, PROMPT_TAKES, db),
      messages,
      moreMessages,
      // The AI allowance as percentages (usage.controller.ts), so the sidebar's meter
      // is right from the first paint without a request of its own.
      usage: await usageFor(userId, db),
    };
  });
  if (!state) throw gone();
  // A student's own data: never kept by a browser cache or a proxy.
  res.set("Cache-Control", "no-store");
  res.json(state);
}

/**
 * GET /api/export → one JSON file with everything Trellis holds about the student.
 *
 * Everything means every row with their user id, unpaged. What is left out, and why:
 * the password hash and the sign-in token hashes (secrets that are useless to the
 * student and dangerous in a file that gets passed around), and the request logs, which
 * hold no message text (backend-design.md §8).
 */
export async function exportAll(req: Request, res: Response) {
  const userId = currentUserId(req);
  const data = await readSnapshot(async (db) => {
    const account = await getAccountForExport(userId, db);
    if (!account) return null;
    const student = (await getStudent(userId, db))!;

    const messages: Record<string, ChatMessage[]> = {};
    for (const s of subjects) messages[s.id] = (await listMessages(userId, s.id, null, db)).messages;

    return {
      exportedAt: new Date().toISOString(),
      about: "Everything Trellis holds about you. Statuses are not stored; they are worked out from this.",
      account,
      goals: student.goals,
      claims: await listClaims(userId, db),
      checkIns: await listCheckIns(userId, db),
      experiences: await listExperiences(userId, db),
      opened: await listOpened(userId, db),
      promptTakes: await listPromptTakes(userId, null, db),
      messages,
      subjectRequests: await listSubjectRequests(userId, db),
    };
  });
  if (!data) throw gone();
  const day = data.exportedAt.slice(0, 10);
  res.set("Cache-Control", "no-store");
  // "attachment": the browser saves it as a file instead of showing it.
  res.set("Content-Disposition", `attachment; filename="trellis-export-${day}.json"`);
  res.json(data);
}
