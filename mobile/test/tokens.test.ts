// The app's colours must be the site's colours (docs/mobile.md §6). React Native can't read
// CSS, so src/theme/tokens.ts repeats every colour from frontend/app/globals.css; this test
// reads the CSS and fails on any difference, so the two can never drift apart.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { tokens } from "@/theme/tokens";

const css = readFileSync(join(__dirname, "../../frontend/app/globals.css"), "utf8");

/** Every `--name: #hex;` inside the block that starts with `selector`, as {camelName: hex}. */
function coloursIn(selector: string): Record<string, string> {
  const start = css.indexOf(selector);
  const block = css.slice(start, css.indexOf("}", start));
  const found: Record<string, string> = {};
  for (const [, name, hex] of block.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6})\s*;/gi)) {
    found[name!.replace(/-([a-z])/g, (_: string, c: string) => c.toUpperCase())] = hex!.toLowerCase();
  }
  return found;
}

describe("the colour tokens", () => {
  it.each([
    ["light", ':root[data-theme="light"]'],
    ["dark", ':root[data-theme="dark"]'],
  ] as const)("match globals.css in the %s theme", (scheme, selector) => {
    const web = coloursIn(selector);
    // Sanity: the parser found the real list (ground, surface, statuses, difficulty, ...).
    expect(Object.keys(web).length).toBeGreaterThan(30);
    expect(tokens[scheme]).toEqual(web);
  });
});
