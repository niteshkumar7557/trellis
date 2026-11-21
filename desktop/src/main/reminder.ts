// The daily study reminder: a notification at a time the student picks (docs/desktop.md §7).
//
// It runs entirely on the Mac: no server, no account data. It's off until the student
// turns it on in the menu-bar icon's "Daily Reminder" menu, and it only fires while the
// app is running (closing the window keeps it running; ⌘Q stops it).

import { app, Notification, powerMonitor, type MenuItemConstructorOptions } from "electron";
import { msUntilNext } from "./reminder-time";
import { loadSettings, saveSettings, type Settings } from "./settings";
import { setTrayExtras } from "./tray";

export const REMINDER_TIMES = ["08:00", "13:00", "19:00", "21:00"];

let timer: NodeJS.Timeout | null = null;
/**
 * The last notification shown. Kept in a variable on purpose: if nothing refers to it,
 * JavaScript's garbage collector may free it, and its click handler goes with it.
 */
let shown: Notification | null = null;
let onOpen: () => void = () => {};

const dir = () => app.getPath("userData");

export function startReminder(openMap: () => void): void {
  onOpen = openMap;
  arm();
  // Node's timers don't count time while the Mac sleeps: a timer set at 18:00 for one
  // hour, on a laptop closed until 20:00, would fire at 21:00. Re-aim it on every wake.
  powerMonitor.on("resume", arm);
  setTrayExtras(trayItems);
}

/** Cancel any pending timer and set a new one from the current settings. */
function arm(): void {
  if (timer) clearTimeout(timer);
  timer = null;
  const { reminder } = loadSettings(dir());
  if (!reminder.on) return;
  // A developer's shortcut to see it work: fire 10 seconds after start (never when packaged).
  const wait = !app.isPackaged && process.env.TRELLIS_REMINDER_TEST ? 10_000 : msUntilNext(reminder.time, new Date());
  timer = setTimeout(() => {
    fire();
    arm(); // and tomorrow's
  }, wait);
}

function fire(): void {
  if (!Notification.isSupported()) return;
  shown = new Notification({ title: "Time to study", body: "Your map is waiting." });
  shown.on("click", () => onOpen());
  shown.show();
}

function update(change: (r: Settings["reminder"]) => Settings["reminder"]): void {
  const s = loadSettings(dir());
  saveSettings(dir(), { ...s, reminder: change(s.reminder) });
  arm();
  setTrayExtras(trayItems); // the menu shows the new state
}

/** The menu-bar icon's "Daily Reminder" submenu: on/off, and a few fixed times. */
function trayItems(): MenuItemConstructorOptions[] {
  const { reminder } = loadSettings(dir());
  return [
    {
      label: "Daily Reminder",
      submenu: [
        { label: "On", type: "checkbox", checked: reminder.on, click: () => update((r) => ({ ...r, on: !r.on })) },
        { type: "separator" },
        ...REMINDER_TIMES.map(
          (time): MenuItemConstructorOptions => ({
            label: time,
            type: "radio",
            checked: reminder.time === time,
            click: () => update((r) => ({ ...r, time })),
          }),
        ),
      ],
    },
  ];
}
