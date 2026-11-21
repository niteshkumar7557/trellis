// The app's few settings, in one JSON file in the app's data folder
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
  /** The daily study reminder (docs/desktop.md §7). Off until the student turns it on. */
  reminder: { on: boolean; time: string /* "HH:MM", 24-hour, local time */ };
}

export const DEFAULT_SETTINGS: Settings = { reminder: { on: false, time: "19:00" } };

const FILE = "settings.json";
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
export const isTime = (v: unknown): v is string => typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);

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
  if (r.reminder && typeof r.reminder.on === "boolean" && isTime(r.reminder.time)) {
    s.reminder = { on: r.reminder.on, time: r.reminder.time };
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
