// Reading the one-time code out of the trellis://auth link that ends Google sign-in.
// Anything that isn't exactly our link with a 64-hex code is refused.

import { codeFrom } from "@/lib/google";

const CODE = "a1".repeat(32);

describe("codeFrom", () => {
  it("reads the code from trellis://auth?code=…", () => {
    expect(codeFrom(`trellis://auth?code=${CODE}`)).toBe(CODE);
  });

  it.each([
    ["another scheme", `https://evil.test/auth?code=${CODE}`],
    ["another path", `trellis://open?code=${CODE}`],
    ["no code", "trellis://auth"],
    ["a code of the wrong shape", "trellis://auth?code=1234"],
    ["capital hex (the server only makes lower case)", `trellis://auth?code=${CODE.toUpperCase()}`],
  ])("refuses %s", (_, url) => {
    expect(codeFrom(url)).toBeNull();
  });
});
