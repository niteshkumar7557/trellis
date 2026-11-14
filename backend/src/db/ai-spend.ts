// The operator's view of what the AI costs (docs/backend-design.md §5 "Cost limits").
//
//   development:  npm run ai:spend
//   production:   docker compose exec api node dist/db/ai-spend.js
//
// Prints the spend for today, this week and the last 30 days against the limits, and the
// accounts that used most this week. Accounts appear by id only: this is a money report,
// not a way to look at anyone's record, and ai_calls holds no message text to show.
//
// The numbers are OUR count (token counts times the configured prices, plus reservations
// for calls that timed out), so they run a little above the real bill. The bill itself is
// in the AWS console under Billing; compare the two once a week (docs/aws.md §3).

import { limits } from "../ai/limits.js";
import config from "../config/index.js";
import { spendReport, type SpendReport } from "../repos/ai-calls.repo.js";
import pool from "./index.js";

const usd = (n: number) => `$${n.toFixed(4)}`;
const pct = (n: number, of: number) => (of > 0 ? `${Math.round((n / of) * 100)}%` : "-");

/** The report as lines of text. Separate from printing, so a test can read it. */
export function formatReport(r: SpendReport): string[] {
  const l = limits();
  const today = r.periods.find((p) => p.label === "today")?.usd ?? 0;
  const lines = [
    `AI: ${config.ai.provider === "bedrock" ? `${config.ai.reader_model} on Bedrock (${config.ai.region})` : "off"}`,
    `Limits: site ${usd(l.siteDailyUsd)} a day; one account ${usd(l.userDailyUsd)} a day, ${usd(l.userWeeklyUsd)} a week`,
    "",
    ...r.periods.map((p) => `${p.label.padEnd(13)} ${usd(p.usd).padStart(9)}   ${String(p.calls).padStart(5)} calls`),
    `Site budget used today: ${pct(today, l.siteDailyUsd)}`,
    "",
    r.topAccounts.length ? "Accounts this week (id, today, this week):" : "No account has used the AI this week.",
    ...r.topAccounts.map(
      (a) =>
        `  #${String(a.userId).padEnd(6)} ${usd(a.usdDay)} (${pct(a.usdDay, l.userDailyUsd)})   ${usd(a.usdWeek)} (${pct(a.usdWeek, l.userWeeklyUsd)})`,
    ),
  ];
  if (r.stuckPending > 0) {
    // Harmless for the money (they count at their reservation), but worth knowing about.
    lines.push("", `${r.stuckPending} call(s) were reserved and never settled: the server stopped mid-call.`);
  }
  return lines;
}

// Run only when started as a script, not when a test imports formatReport.
const isScript = process.argv[1]?.replace(/\.ts$/, ".js").endsWith("ai-spend.js");

if (isScript) {
  try {
    console.log(formatReport(await spendReport()).join("\n"));
  } finally {
    await pool.end();
  }
}
