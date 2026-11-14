// What "trust proxy" = 2 does with the X-Forwarded-For header production sends
// (docs/aws.md §4): the visitor → CloudFront → Caddy → the API. Each proxy appends the
// address it got the request from, so the API sees
//
//   X-Forwarded-For: <whatever the visitor sent>, <visitor>, <CloudFront edge>
//
// from Caddy's socket. Skipping exactly two hops (Caddy, CloudFront) lands on the
// visitor, and a forged first entry is never reached.

import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";

const appTrusting = (hops: number) => {
  const app = express();
  app.set("trust proxy", hops);
  app.get("/ip", (req, res) => res.json({ ip: req.ip }));
  return app;
};

describe("trust proxy with CloudFront and Caddy in front", () => {
  it("finds the visitor, two hops from the API", async () => {
    const res = await request(appTrusting(2)).get("/ip").set("X-Forwarded-For", "49.36.1.2, 64.252.1.1");
    expect(res.body.ip).toBe("49.36.1.2");
  });

  it("ignores an address the visitor forged", async () => {
    // The visitor sent "X-Forwarded-For: 1.1.1.1"; CloudFront appended the real address.
    const res = await request(appTrusting(2)).get("/ip").set("X-Forwarded-For", "1.1.1.1, 49.36.1.2, 64.252.1.1");
    expect(res.body.ip).toBe("49.36.1.2");
  });

  it("with one hop too few, every visitor looks like the CloudFront edge", async () => {
    // The mistake this setting prevents: all of India sharing one login rate limit.
    const res = await request(appTrusting(1)).get("/ip").set("X-Forwarded-For", "49.36.1.2, 64.252.1.1");
    expect(res.body.ip).toBe("64.252.1.1");
  });
});
