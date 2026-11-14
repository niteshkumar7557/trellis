// Words for the AI allowance (shared/types.ts AiUsage), used by the sidebar's meter, the
// Settings page and the chat. Kept in one file so the three always say the same thing.
//
// The server sends percentages and reset times only. The allowance is counted in dollars
// there (docs/backend-design.md §5 "Cost limits"); no screen ever shows an amount.

import type { AiUsage } from "@shared/types";

/** From this percentage the meter turns amber: a nudge, well before anything changes. */
export const NEARLY = 80;

/**
 * Which of the two windows the sidebar's one small meter shows: the one that is, or will
 * first be, in the student's way. At a limit that is the limit reached; otherwise the
 * fuller of the two, and today on a tie (it changes fastest, so it is the most useful).
 */
export function tighterWindow(u: AiUsage): "day" | "week" {
  if (u.basic === "week") return "week";
  if (u.basic === "day") return "day";
  return u.week.usedPct > u.day.usedPct ? "week" : "day";
}

/**
 * A reset time in the student's own time zone and habit: "5:30 am" in India.
 * The server's windows turn over at midnight UTC, which is a different local time
 * everywhere, so the time is never written into the text by hand.
 */
export function resetClock(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/** The weekday a week's allowance comes back: "Monday". */
export function resetWeekday(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { weekday: "long" });
}

/** When AI reading comes back, for a sentence: "5:30 am" or "Monday at 5:30 am". */
export function backAt(u: AiUsage): string {
  // The site's shared budget resets with the day, like an account's daily allowance.
  if (u.basic === "week") return `${resetWeekday(u.week.resetsAt)} at ${resetClock(u.week.resetsAt)}`;
  return resetClock(u.day.resetsAt);
}

/**
 * One line saying why the helper is in basic mode, or null when the AI is reading.
 * "Basic mode" is the rule-based reader: it still answers, just less cleverly.
 */
export function basicReason(u: AiUsage): string | null {
  switch (u.basic) {
    case "day":
      return "You've used today's AI allowance.";
    case "week":
      return "You've used this week's AI allowance.";
    case "site":
      // Nobody's own limit: the whole site shares one daily budget.
      return "AI reading is paused for everyone for today.";
    default:
      return null;
  }
}
