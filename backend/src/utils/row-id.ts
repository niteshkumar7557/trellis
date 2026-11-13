// Ids in URLs (/api/check-ins/:id) are UUIDs. Postgres throws on a malformed one
// ("invalid input syntax for type uuid"), which would surface as a 500. A malformed id
// can't name a row, so it gets the same 404 as an id that isn't theirs.

import { z } from "zod";
import { HttpError } from "./http-error.js";

const Uuid = z.uuid();

export function uuidOr404(id: string, what: string): string {
  if (!Uuid.safeParse(id).success) throw new HttpError(404, "not_found", `No such ${what}.`);
  return id;
}
