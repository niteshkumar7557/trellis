// src/ai/limits.ts: the money rules, with no database. Which limit stops a call, what
// percentage a student sees, how much a call reserves, and what a finished call counts as.

import { beforeEach, describe, expect, it, vi } from "vitest";
import config from "../src/config/index.js";
import { blockedBy, chargeFor, costUsd, percentUsed, usageOf, worstCaseUsd, type Limits, type Spend } from "../src/ai/limits.js";

const LIMITS: Limits = { siteDailyUsd: 0.5, userDailyUsd: 0.06, userWeeklyUsd: 0.25 };
const spend = (over: Partial<Spend> = {}): Spend => ({ siteDay: 0, userDay: 0, userWeek: 0, ...over });
const WINDOWS = { dayEnds: new Date("2026-11-15T00:00:00Z"), weekEnds: new Date("2026-11-16T00:00:00Z") };

beforeEach(() => {
  // Vitest runs with AI_PROVIDER=off; these tests are about a server with the AI on.
  vi.spyOn(config.ai, "provider", "get").mockReturnValue("bedrock");
});

describe("blockedBy", () => {
  it("allows a call while anything is left in every window", () => {
    expect(blockedBy(spend(), LIMITS)).toBeNull();
    expect(blockedBy(spend({ siteDay: 0.4999, userDay: 0.0599, userWeek: 0.2499 }), LIMITS)).toBeNull();
  });

  it("stops at each limit exactly when it is reached", () => {
    expect(blockedBy(spend({ userDay: 0.06, userWeek: 0.06 }), LIMITS)).toBe("day");
    expect(blockedBy(spend({ userWeek: 0.25 }), LIMITS)).toBe("week");
    expect(blockedBy(spend({ siteDay: 0.5 }), LIMITS)).toBe("site");
  });

  it("names the longest wait when several limits are reached", () => {
    expect(blockedBy(spend({ siteDay: 0.5, userDay: 0.06, userWeek: 0.25 }), LIMITS)).toBe("week");
    expect(blockedBy(spend({ siteDay: 0.5, userDay: 0.06 }), LIMITS)).toBe("day");
  });

  it("holds the server's own warm-up call to the site's budget only", () => {
    // A warm-up has no account, so an account's sums must never stop it.
    expect(blockedBy(spend({ userDay: 9, userWeek: 9 }), LIMITS, false)).toBeNull();
    expect(blockedBy(spend({ siteDay: 0.5 }), LIMITS, false)).toBe("site");
  });

  it("treats a limit of zero as 'no AI calls'", () => {
    expect(blockedBy(spend(), { ...LIMITS, userDailyUsd: 0 })).toBe("day");
  });
});

describe("percentUsed", () => {
  it("is a whole number from 0 to 100", () => {
    expect(percentUsed(0, 0.06)).toBe(0);
    expect(percentUsed(0.03, 0.06)).toBe(50);
    expect(percentUsed(0.06, 0.06)).toBe(100);
    expect(percentUsed(0.09, 0.06)).toBe(100); // one call past the limit is still 100
  });

  it("shows at least 1% once anything is spent", () => {
    // One message of a quarter-dollar week is 0.8%: 0 would say "nothing used".
    expect(percentUsed(0.002, 0.25)).toBe(1);
  });

  it("shows 100% only when the limit is really reached", () => {
    // 99.7% rounds to 100, but the AI still reads the next message: say 99.
    expect(percentUsed(0.0598, 0.06)).toBe(99);
  });

  it("doesn't divide by a zero limit", () => {
    expect(percentUsed(0, 0)).toBe(100);
  });
});

describe("usageOf", () => {
  it("gives percentages and reset times, and no dollars", () => {
    const usage = usageOf(spend({ siteDay: 0.2, userDay: 0.03, userWeek: 0.05 }), WINDOWS, LIMITS);
    expect(usage).toEqual({
      on: true,
      day: { usedPct: 50, resetsAt: "2026-11-15T00:00:00.000Z" },
      week: { usedPct: 20, resetsAt: "2026-11-16T00:00:00.000Z" },
      basic: null,
    });
    // The whole point of this shape: nothing in it lets a student work out a price.
    expect(JSON.stringify(usage)).not.toMatch(/usd|0\.03|0\.05|0\.2|cost|\$/i);
  });

  it("says which limit put the helper in basic mode", () => {
    expect(usageOf(spend({ userDay: 0.06, userWeek: 0.06 }), WINDOWS, LIMITS).basic).toBe("day");
    expect(usageOf(spend({ userWeek: 0.25 }), WINDOWS, LIMITS).basic).toBe("week");
    // The site's budget is spent, but this account's own meter is nearly empty.
    const site = usageOf(spend({ siteDay: 0.5, userDay: 0.002, userWeek: 0.002 }), WINDOWS, LIMITS);
    expect(site.basic).toBe("site");
    expect(site.day.usedPct).toBe(3);
  });

  it("reports no limit when the AI is off: the rules read everything anyway", () => {
    vi.spyOn(config.ai, "provider", "get").mockReturnValue("off");
    const usage = usageOf(spend({ userDay: 1, userWeek: 1 }), WINDOWS, LIMITS);
    expect(usage.on).toBe(false);
    expect(usage.basic).toBeNull();
  });
});

describe("pricing one call", () => {
  it("prices tokens with the configured rates, rounded to the column's 6 places", () => {
    // 1,700 in at $1.03/M and 120 out at $3.30/M (Sydney): about a fifth of a cent.
    expect(costUsd(1700, 120)).toBe(0.002147);
    expect(costUsd(0, 0)).toBe(0);
  });

  it("reserves one input token per 3 bytes plus the whole output cap", () => {
    expect(worstCaseUsd("x".repeat(3000), 600)).toBe(costUsd(1000, 600));
    // Bytes, not characters: Hindi takes 3 bytes a letter and more tokens than English.
    expect(worstCaseUsd("ह".repeat(1000), 600)).toBe(costUsd(1000, 600));
  });

  it("reserves more than the real instructions have ever cost", () => {
    // Measured on Bedrock (14 Nov 2026): Redis, the longer subject, is 7,809 characters
    // and 2,138 tokens in, and replies stay under 120 tokens.
    expect(worstCaseUsd("x".repeat(7809), 600)).toBeGreaterThan(costUsd(2138, 120));
  });

  it("counts a finished call as what its tokens cost, usable reply or not", () => {
    expect(chargeFor(1700, 120, null, 0.0045)).toBe(costUsd(1700, 120));
    expect(chargeFor(1700, 120, "bad_output", 0.0045)).toBe(costUsd(1700, 120));
  });

  it("counts nothing when Bedrock refused the request before running the model", () => {
    for (const error of ["throttled", "denied", "no_model", "invalid_request", "no_credentials", "unavailable"]) {
      expect(chargeFor(null, null, error, 0.0045), error).toBe(0);
    }
  });

  it("counts the whole reservation when nobody knows what was billed", () => {
    expect(chargeFor(null, null, "timeout", 0.0045)).toBe(0.0045);
    expect(chargeFor(null, null, "error", 0.0045)).toBe(0.0045);
    // A reply with no token counts at all: assume the worst too.
    expect(chargeFor(null, null, null, 0.0045)).toBe(0.0045);
  });
});
