// POST /api/claims: the sort. The student deals cards into know / shaky / new.

import { topicById, topics } from "@shared/data";
import type { ClaimKind } from "@shared/types";
import type { Request, Response } from "express";
import { z } from "zod";
import { currentUserId } from "../middlewares/auth.middleware.js";
import { addClaims } from "../repos/claims.repo.js";
import { HttpError } from "../utils/http-error.js";

export const PostClaimsBody = z.object({
  claims: z
    .array(z.object({ topicId: z.string().min(1).max(100), claim: z.enum(["know", "shaky", "new"]) }))
    .min(1)
    // A claim per topic of both subjects is the most a real sort can send.
    .max(topics.length),
});

/** POST /api/claims {claims: [{topicId, claim}]} → 201 Claim[] */
export async function postClaims(req: Request, res: Response) {
  const { claims } = req.body as z.infer<typeof PostClaimsBody>;

  const unknown = claims.filter((c) => !topicById.has(c.topicId)).map((c) => c.topicId);
  if (unknown.length > 0) {
    throw new HttpError(400, "invalid_request", `No such topic: ${unknown.slice(0, 5).join(", ")}.`);
  }

  // "Later claims win per topic." Within one request every row gets the same timestamp,
  // so two claims on one topic would tie and either could count. Keep only the last one
  // the student made, which is what they meant. A Map keeps the last value for a key.
  const latest = new Map<string, ClaimKind>();
  for (const c of claims) latest.set(c.topicId, c.claim);
  const deduped = [...latest].map(([topicId, claim]) => ({ topicId, claim }));

  res.status(201).json(await addClaims(currentUserId(req), deduped));
}
