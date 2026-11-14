// An EXPECTED failure, thrown on purpose by a route handler, e.g.
//   throw new HttpError(404, "not_found", "No such topic.");
// The error middleware (error.middleware.ts) turns it into the API's error shape:
//   HTTP 404   { "error": { "code": "not_found", "message": "No such topic." } }
// `code` is for the frontend's code (stable, snake_case); `message` is for people.
// `details` is optional extra information for the client, such as which body fields
// failed validation (validate.middleware.ts).

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "HttpError";
  }
}
