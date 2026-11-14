// Checks a request body against a zod schema BEFORE the handler runs:
//
//   router.post("/claims", validateBody(ClaimsBody), createClaims);
//
// If the body fits, req.body is replaced with zod's parsed copy: typed, and with any
// unknown fields stripped, so handlers never see junk. If it doesn't fit, it throws a
// 400 HttpError with the details, which the error handler sends as it is.
//
// Why turn the ZodError into an HttpError HERE, instead of letting the error handler
// treat every ZodError as a bad request (as it did until M5.2): zod is used elsewhere too,
// for example to check what the AI model sent back (src/ai/reader.ts). A failed check
// there is OUR problem, not the student's, and must never be reported as "your request
// is not valid". So only this middleware, which knows the zod error is about the body,
// says 400. Any other ZodError that escapes is a bug and answers 500.

import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { HttpError } from "../utils/http-error.js";

export function validateBody(schema: ZodType) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      const details = parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }));
      throw new HttpError(400, "invalid_request", "The request body is not valid.", details);
    }
    req.body = parsed.data;
    next();
  };
}
