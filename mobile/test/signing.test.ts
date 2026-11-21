// The signing plugin edits Gradle's text. If its patterns ever stopped matching (a new
// React Native template), release builds would silently go back to the public debug key,
// so it's tested against a real generated app/build.gradle (test/fixtures/build.gradle,
// from `expo prebuild` on 21 Nov 2026, Expo SDK 58).

import { readFileSync } from "node:fs";
import { join } from "node:path";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { addSigning } = require("../plugins/with-release-signing") as { addSigning: (gradle: string) => string };

const generated = readFileSync(join(__dirname, "fixtures/build.gradle"), "utf8");

it("signs release builds with our key and debug builds with the debug key", () => {
  const out = addSigning(generated);
  const release = out.slice(out.indexOf("buildTypes"));
  expect(release).toMatch(/debug \{\s*signingConfig signingConfigs\.debug/);
  expect(release).toMatch(/release \{[\s\S]*?signingConfig signingConfigs\.release/);
  expect(out).toContain("storeFile file(TRELLIS_UPLOAD_STORE_FILE)");
});

it("fails a release build when the keystore isn't configured", () => {
  expect(addSigning(generated)).toContain("Release signing isn't set up");
});

it("changes nothing the second time (prebuild may run it again)", () => {
  const once = addSigning(generated);
  expect(addSigning(once)).toBe(once);
});
