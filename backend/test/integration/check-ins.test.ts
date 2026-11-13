// Check-ins against the real Postgres: listing (with the message they came from), fixing,
// removing, and that one student can never reach another's.

import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import app from "../../src/app.js";
import pool from "../../src/db/index.js";
import { deleteUsers, insertSavedCheckIn, registerStudent } from "./helpers.js";

const DOMAIN = "@it-checkins.trellis.test";
let ada: Awaited<ReturnType<typeof registerStudent>>;
let bob: Awaited<ReturnType<typeof registerStudent>>;

beforeAll(async () => {
  await deleteUsers(DOMAIN);
  ada = await registerStudent(DOMAIN, "Ada");
  bob = await registerStudent(DOMAIN, "Bob");
});
afterAll(async () => {
  await deleteUsers(DOMAIN);
  await pool.end();
});

describe("check-ins", () => {
  it("lists newest first, each with the helper message that made it", async () => {
    const older = await insertSavedCheckIn(ada.userId, "rn-what", "stuck", "lost", "2026-11-01T10:00:00Z");
    const newer = await insertSavedCheckIn(ada.userId, "rn-what", "got", "got it", "2026-11-02T10:00:00Z");

    const res = await request(app).get("/api/check-ins").set(ada.auth);
    expect(res.status).toBe(200);
    expect(res.body.map((c: { id: string }) => c.id)).toEqual([newer.checkInId, older.checkInId]);
    expect(res.body[0]).toEqual({
      id: newer.checkInId,
      at: "2026-11-02T10:00:00.000Z",
      text: "got it",
      topicId: "rn-what",
      outcome: "got",
      messageId: newer.messageId,
    });
  });

  it("fixes a check-in, keeping the fields not sent and its time", async () => {
    const { checkInId } = await insertSavedCheckIn(ada.userId, "rn-what", "stuck", "lost", "2026-11-03T10:00:00Z");
    const res = await request(app).patch(`/api/check-ins/${checkInId}`).set(ada.auth).send({ topicId: "rn-why" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ topicId: "rn-why", outcome: "stuck", text: "lost", at: "2026-11-03T10:00:00.000Z" });
  });

  it("removes a check-in, and a second remove answers 404", async () => {
    const { checkInId } = await insertSavedCheckIn(ada.userId, "rn-why", "partly", "half");
    expect((await request(app).delete(`/api/check-ins/${checkInId}`).set(ada.auth)).status).toBe(204);
    expect((await request(app).delete(`/api/check-ins/${checkInId}`).set(ada.auth)).status).toBe(404);
  });

  it("never lets one student see, change or remove another's", async () => {
    const { checkInId } = await insertSavedCheckIn(ada.userId, "rn-what", "got", "mine");

    const list = await request(app).get("/api/check-ins").set(bob.auth);
    expect(list.body).toEqual([]);
    expect((await request(app).patch(`/api/check-ins/${checkInId}`).set(bob.auth).send({ text: "hacked" })).status).toBe(404);
    expect((await request(app).delete(`/api/check-ins/${checkInId}`).set(bob.auth)).status).toBe(404);

    const { rows } = await pool.query("SELECT text FROM check_ins WHERE id = $1", [checkInId]);
    expect(rows[0].text).toBe("mine");
  });

  it("allows only one open proposal per student and subject (the database refuses a second)", async () => {
    const msg = await pool.query(
      "INSERT INTO chat_messages (user_id, subject_id, role, text) VALUES ($1, 'redis', 'helper', 'Save?') RETURNING id",
      [ada.userId],
    );
    const insertOpen = () =>
      pool.query("INSERT INTO proposals (user_id, subject_id, message_id, payload) VALUES ($1, 'redis', $2, '{}')", [
        ada.userId,
        msg.rows[0].id,
      ]);
    await insertOpen();
    await expect(insertOpen()).rejects.toThrow(/proposals_one_open/);
  });
});
