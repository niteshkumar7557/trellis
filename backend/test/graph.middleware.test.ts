// Tests for src/middlewares/graph.middleware.ts: how the API remembers whether Neo4j is up.
// The repo's checkGraph() is a fake, so each test decides what Neo4j "says".

import { beforeEach, describe, expect, it, vi } from "vitest";
import { forgetGraphState, graphState, isGraphOutage } from "../src/middlewares/graph.middleware.js";
import { checkGraph } from "../src/repos/graph.repo.js";

vi.mock("../src/repos/graph.repo.js", () => ({ checkGraph: vi.fn() }));

beforeEach(() => {
  vi.resetAllMocks();
  forgetGraphState();
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("graphState", () => {
  it("remembers the answer for 30 seconds, then checks again", async () => {
    vi.mocked(checkGraph).mockResolvedValue({ state: "down", problems: ["refused"] });
    expect(await graphState(0)).toBe("down");
    expect(await graphState(29_999)).toBe("down");
    expect(checkGraph).toHaveBeenCalledTimes(1);

    // Neo4j came back: the next check after 30 s sees it.
    vi.mocked(checkGraph).mockResolvedValue({ state: "ok", problems: [] });
    expect(await graphState(30_000)).toBe("ok");
    expect(checkGraph).toHaveBeenCalledTimes(2);
  });

  it("runs ONE check for requests that arrive together", async () => {
    vi.mocked(checkGraph).mockResolvedValue({ state: "ok", problems: [] });
    const states = await Promise.all([graphState(0), graphState(0), graphState(0)]);
    expect(states).toEqual(["ok", "ok", "ok"]);
    expect(checkGraph).toHaveBeenCalledTimes(1);
  });

  it("checks again straight away after forgetGraphState()", async () => {
    vi.mocked(checkGraph).mockResolvedValue({ state: "ok", problems: [] });
    await graphState(0);
    forgetGraphState();
    await graphState(1);
    expect(checkGraph).toHaveBeenCalledTimes(2);
  });

  it("logs only when the state changes", async () => {
    vi.mocked(checkGraph).mockResolvedValue({ state: "down", problems: ["refused"] });
    await graphState(0);
    await graphState(60_000);
    await graphState(120_000);
    expect(console.error).toHaveBeenCalledTimes(1);
  });
});

describe("isGraphOutage", () => {
  it("is true only for the driver's 'can't reach Neo4j' codes", () => {
    expect(isGraphOutage({ code: "ServiceUnavailable" })).toBe(true);
    expect(isGraphOutage({ code: "SessionExpired" })).toBe(true);
    expect(isGraphOutage({ code: "Neo.ClientError.Statement.SyntaxError" })).toBe(false);
    expect(isGraphOutage(new Error("plain bug"))).toBe(false);
    expect(isGraphOutage(null)).toBe(false);
  });
});
