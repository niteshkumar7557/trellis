// A real signed token, for testing routes behind requireAuth. Not a test file itself.
//
// config reads JWT_SECRET once, when first imported, so a test must set the variable BEFORE
// any import runs. vi.hoisted() runs its code above the imports:
//
//   vi.hoisted(() => { process.env.JWT_SECRET = "test-secret"; });

import jwt from "jsonwebtoken";

export function bearerToken() {
  return `Bearer ${jwt.sign({ id: 1, role: "user", name: "Test", email: "t@example.com" }, "test-secret")}`;
}
