// Checks a request body against a zod schema BEFORE the handler runs:
//
//   router.post("/claims", validateBody(ClaimsBody), createClaims);
//
// If the body fits, req.body is replaced with zod's parsed copy: typed, and with any
// unknown fields stripped, so handlers never see junk. If it doesn't fit, schema.parse()
// THROWS a ZodError. We don't catch it here: Express passes anything thrown in a
// middleware to the error handler, which answers 400 with the details.

import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";

export function validateBody(schema: ZodType) {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.body = schema.parse(req.body);
    next();
  };
}
