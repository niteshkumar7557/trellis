// The app's settings (today only the window's position), in one JSON file in the app's data folder
// (~/Library/Application Support/Trellis/settings.json once packaged).
//
// Why not the `electron-store` package: it does this plus schemas, migrations and
// encryption we don't need. Two functions and a validator are easier to read and debug.
//
// The folder is a parameter (not `app.getPath("userData")` inside) so the tests can use a
// temporary folder and this file needs no `electron` import.

import { readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Settings {
  /** Where the window was when it last closed; none on first launch. */
  bounds?: Bounds;
}

// (1.0.0 also kept a daily reminder here; 1.0.1 removed the reminder, and an old file's
// "reminder" field is simply ignored by loadSettings.)
export const DEFAULT_SETTINGS: Settings = {};

const FILE = "settings.json";
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/**
 * Read the settings. Never throws: a missing, broken or hand-edited file gives the
 * defaults for whatever part is wrong. A settings file must never stop the app starting.
 */
export function loadSettings(dir: string): Settings {
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(join(dir, FILE), "utf8"));
  } catch {
    return structuredClone(DEFAULT_SETTINGS);
  }
  const r = (raw ?? {}) as Record<string, any>;
  const s: Settings = structuredClone(DEFAULT_SETTINGS);

  const b = r.bounds;
  if (b && isNum(b.x) && isNum(b.y) && isNum(b.width) && isNum(b.height)) {
    s.bounds = { x: b.x, y: b.y, width: b.width, height: b.height };
  }
  return s;
}

/**
 * Write the settings. Written to a temporary file and then renamed, because a rename is
 * atomic: if the app is killed mid-write, the old file is still whole.
 */
export function saveSettings(dir: string, s: Settings): void {
  const path = join(dir, FILE);
  writeFileSync(`${path}.tmp`, JSON.stringify(s, null, 2));
  renameSync(`${path}.tmp`, path);
}
