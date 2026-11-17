import { describe, expect, it } from "vitest";
import { formatHealth } from "../src/db/ai-spend.js";

describe("AI health report", () => {
  it("shows model share, fallback share, and failure latency without student data", () => {
    const lines = formatHealth({
      readers: [{ readBy: "model", messages: 7 }, { readBy: "rules", messages: 3 }],
      attempts: [
        { error: null, calls: 7, p50Ms: 2100.4, p90Ms: 3500.2 },
        { error: "timeout", calls: 2, p50Ms: 6000, p90Ms: 6000 },
      ],
    }).join("\n");
    expect(lines).toContain("model 7 (70%); rules 3 (30%)");
    expect(lines).toContain("ok: 7, 2100ms, 3500ms");
    expect(lines).toContain("timeout: 2, 6000ms, 6000ms");
    expect(lines).not.toMatch(/user_id|email|message text/i);
  });

  it("handles a quiet site without dividing by zero", () => {
    const lines = formatHealth({ readers: [], attempts: [] }).join("\n");
    expect(lines).toContain("model 0 (-); rules 0 (-)");
    expect(lines).toContain("none");
  });
});
