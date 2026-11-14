// Save, Cancel and Undo against the real Postgres, through real helper conversations.
// The point of these tests: each action works exactly once, Save writes everything or
// nothing, and Undo removes exactly what its save made.

import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import app from "../../src/app.js";
import pool from "../../src/db/index.js";
import { deleteUsers, registerStudent } from "./helpers.js";

const DOMAIN = "@it-proposals.trellis.test";
type Student = Awaited<ReturnType<typeof registerStudent>>;
let ada: Student;
let bob: Student;

const tap = (who: Student, outcome: string, topicIds: string[], label = "Got it") =>
  request(app).post("/api/helper/react-native/messages").set(who.auth).send({ pick: { outcome, topicIds, label } });
const say = (who: Student, text: string) =>
  request(app).post("/api/helper/react-native/messages").set(who.auth).send({ text });
const act = (who: Student, id: string, action: "save" | "cancel" | "undo", body?: object) =>
  request(app).post(`/api/helper/proposals/${id}/${action}`).set(who.auth).send(body ?? {});
const count = async (who: Student, table: string) =>
  (await pool.query(`SELECT count(*)::int AS n FROM ${table} WHERE user_id = $1`, [who.userId])).rows[0].n;

/** Sends a multi-topic tap (no question asked) and returns the confirm card it made. */
async function proposeTwo(who: Student, outcome = "got") {
  const res = await tap(who, outcome, ["rn-what", "rn-why"]);
  const card = res.body.messages[1].cards[0];
  expect(card.type).toBe("confirm");
  return card as { proposalId: string; proposal: { updates: object[]; experiences: object[]; said: string } };
}

beforeAll(async () => {
  await deleteUsers(DOMAIN);
  ada = await registerStudent(DOMAIN, "Ada");
  bob = await registerStudent(DOMAIN, "Bob");
  await request(app).put("/api/goals/react-native").set(ada.auth).send({ goalId: "goal-rn-first-app" });
});
afterAll(async () => {
  await deleteUsers(DOMAIN);
  await pool.end();
});

describe("save", () => {
  it("saves the question-and-answer proposal: check-ins, experiences, a follow-up", async () => {
    await tap(ada, "stuck", ["rn-what"], "Stuck");
    const answer = await say(ada, "the native parts were new to me");
    const card = answer.body.messages[1].cards[0];

    const res = await act(ada, card.proposalId, "save", { proposal: card.proposal });
    expect(res.status).toBe(200);
    expect(res.body.checkIns).toEqual([
      expect.objectContaining({ topicId: "rn-what", outcome: "stuck", text: "Stuck: What is React Native?", messageId: answer.body.messages[1].id }),
    ]);
    expect(res.body.experiences).toEqual([
      expect.objectContaining({ kind: "hard", text: "the native parts were new to me", line: "The native parts were new to me." }),
    ]);
    // The card now shows what the save made, so Undo knows what to remove.
    expect(res.body.message.cards[0]).toMatchObject({
      state: "saved",
      saved: { checkIns: [res.body.checkIns[0].id], experiences: [res.body.experiences[0].id] },
    });
    // The follow-up comes from afterSave(): stuck → a prompt card.
    expect(res.body.followUp).toMatchObject({ role: "helper", text: expect.stringMatching(/^Saved\./) });
    expect(res.body.followUp.cards[0].type).toBe("prompt");
  });

  it("works once: a second save answers 409 and adds nothing", async () => {
    const card = await proposeTwo(ada);
    expect((await act(ada, card.proposalId, "save", { proposal: card.proposal })).status).toBe(200);
    const before = await count(ada, "check_ins");
    const again = await act(ada, card.proposalId, "save", { proposal: card.proposal });
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe("proposal_not_open");
    expect(await count(ada, "check_ins")).toBe(before);
  });

  it("survives a double click: two saves at once make one set of check-ins", async () => {
    const card = await proposeTwo(ada, "partly");
    const before = await count(ada, "check_ins");
    const results = await Promise.all([
      act(ada, card.proposalId, "save", { proposal: card.proposal }),
      act(ada, card.proposalId, "save", { proposal: card.proposal }),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(await count(ada, "check_ins")).toBe(before + 2); // two topics, saved once
  });

  it("saves the student's edits, keeps an unchanged note's line, rebuilds an edited one, drops a cleared one", async () => {
    const card = await proposeTwo(ada);
    // Pretend the helper (the model, in M5) wrote these lines, better than tidy() would.
    const original = {
      ...card.proposal,
      experiences: [
        { topicId: "rn-what", kind: "easy", text: "kept as is", line: "A model-written line." },
        { topicId: "rn-what", kind: "hard", text: "will be edited", line: "Old line." },
        { topicId: "rn-why", kind: "easy", text: "will be cleared", line: "Gone." },
      ],
    };
    await pool.query("UPDATE proposals SET payload = $2 WHERE id = $1", [card.proposalId, JSON.stringify(original)]);

    const edited = {
      updates: [{ topicId: "rn-what", outcome: "partly" }], // one topic dropped, outcome changed
      experiences: [
        { topicId: "rn-what", kind: "easy", text: "kept as is", line: "IGNORED" },
        { topicId: "rn-what", kind: "hard", text: "now it says something else", line: "IGNORED" },
        { topicId: "rn-why", kind: "easy", text: "   " },
      ],
      said: "",
    };
    const res = await act(ada, card.proposalId, "save", { proposal: edited });
    expect(res.status).toBe(200);
    expect(res.body.checkIns.map((c: { topicId: string; outcome: string }) => [c.topicId, c.outcome])).toEqual([["rn-what", "partly"]]);
    expect(res.body.experiences.map((e: { line: string }) => e.line)).toEqual([
      "A model-written line.",
      "Now it says something else.",
    ]);
  });

  it("refuses a topic from another subject, or a big topic, and leaves the proposal open", async () => {
    const card = await proposeTwo(ada);
    for (const topicId of ["rd-strings", "rn-intro"]) {
      const res = await act(ada, card.proposalId, "save", { proposal: { ...card.proposal, updates: [{ topicId, outcome: "got" }] } });
      expect(res.status).toBe(400);
    }
    const { rows } = await pool.query("SELECT state FROM proposals WHERE id = $1", [card.proposalId]);
    expect(rows[0].state).toBe("open");
  });

  it("refuses a proposal with nothing left in it", async () => {
    const card = await proposeTwo(ada);
    const res = await act(ada, card.proposalId, "save", { proposal: { updates: [], experiences: [], said: "" } });
    expect(res.status).toBe(400);
  });
});

describe("cancel and undo", () => {
  it("cancels an open proposal once; it can't be saved after", async () => {
    const card = await proposeTwo(ada);
    const res = await act(ada, card.proposalId, "cancel");
    expect(res.status).toBe(200);
    expect(res.body.message.cards[0].state).toBe("cancelled");
    expect((await act(ada, card.proposalId, "cancel")).status).toBe(409);
    expect((await act(ada, card.proposalId, "save", { proposal: card.proposal })).status).toBe(409);
  });

  it("undoes a save: removes exactly its rows, once", async () => {
    const card = await proposeTwo(ada);
    const saved = await act(ada, card.proposalId, "save", { proposal: card.proposal });
    const ids: string[] = saved.body.checkIns.map((c: { id: string }) => c.id);
    const before = await count(ada, "check_ins");

    const res = await act(ada, card.proposalId, "undo");
    expect(res.status).toBe(200);
    expect(res.body.message.cards[0].state).toBe("undone");
    expect(await count(ada, "check_ins")).toBe(before - 2);
    const { rowCount } = await pool.query("SELECT 1 FROM check_ins WHERE id = ANY($1::uuid[])", [ids]);
    expect(rowCount).toBe(0);

    expect((await act(ada, card.proposalId, "undo")).status).toBe(409);
  });

  it("can't undo something that was never saved", async () => {
    const card = await proposeTwo(ada);
    expect((await act(ada, card.proposalId, "undo")).status).toBe(409);
  });
});

describe("whose proposal", () => {
  it("answers 404, not 409, to another student, and changes nothing", async () => {
    const card = await proposeTwo(ada);
    for (const action of ["save", "cancel", "undo"] as const) {
      const res = await act(bob, card.proposalId, action, action === "save" ? { proposal: card.proposal } : undefined);
      expect(res.status, action).toBe(404);
    }
    const { rows } = await pool.query("SELECT state FROM proposals WHERE id = $1", [card.proposalId]);
    expect(rows[0].state).toBe("open");
  });
});
