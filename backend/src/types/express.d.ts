// Adds `userId` to Express's Request type, so every handler can read who is signed in
// with full type checking. requireAuth (src/middlewares/auth.middleware.ts) sets it.
//
// Why this and not a custom `AuthenticatedRequest` type: a custom type has to be repeated
// on every handler and fights Express's own generics (Request<{ id: string }>). This adds
// the field once, everywhere. Read it through currentUserId(req), which fails loudly if a
// route forgot requireAuth.

declare global {
  namespace Express {
    interface Request {
      userId?: number;
    }
  }
}

export {};
