import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, test } from "node:test";
import { formatScore } from "../lib/format";
import { validateReview, type ReviewDraft } from "../lib/validation";

function tempDb(): string {
  return path.join(os.tmpdir(), `mintekear-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}.db`);
}

async function openDb(file: string, skipSeed: boolean) {
  process.env.MINTEKEAR_DB = file;
  process.env.MINTEKEAR_SKIP_SEED = skipSeed ? "1" : "0";
  const db = await import("../lib/db");
  db.resetDbForTests();
  const queries = await import("../lib/queries");
  return { db, queries };
}

describe("reviews database", { concurrency: 1 }, () => {
test("example managers show the feed scores", async () => {
  const file = tempDb();
  const { db, queries } = await openDb(file, false);
  try {
    const feed = queries.listFeed();
    assert.deepEqual(
      feed.map((manager) => [manager.name, formatScore(manager.average), manager.sample]),
      [
        ["Thabo Molefe", "1.0", true],
        ["Lerato Nkosi", "5.0", true],
        ["Ayesha Patel", "5.0", true],
        ["Johan Botha", "1.3", true],
        ["Sipho Dlamini", "3.5", true],
      ],
    );
    assert.deepEqual(feed[0].latest.tags, ["micromanages", "takes-credit", "blames-team"]);
    assert.deepEqual(feed[3].latest.tags, ["low-ego", "poor-communication", "plays-favourites"]);
    assert.equal(queries.listFeed("laboratory").length, 1);
    assert.equal(queries.listFeed("laboratory")[0].name, "Ayesha Patel");
  } finally {
    db.resetDbForTests();
    fs.rmSync(file, { force: true });
  }
});

test("a new manager is saved once and the review stays anonymous", async () => {
  const file = tempDb();
  const { db, queries } = await openDb(file, true);
  try {
    const draft: ReviewDraft = {
      mode: "new",
      managerId: "",
      managerName: "Naledi Khumalo",
      managerTitle: "Engineering Manager",
      rating: 5,
      body: "She gives the team the reason for a decision and she shares the credit.",
      tags: ["clear-communicator", "fair"],
      honeypot: "",
    };
    const valid = validateReview(draft);
    assert.equal(valid.ok, true);
    if (!valid.ok) return;

    const first = queries.insertReview(valid.value);
    const second = queries.insertReview(valid.value);
    assert.equal(first.ok, true);
    assert.equal(second.ok, false);
    if (!first.ok) return;

    const manager = queries.getManager(first.managerId);
    assert.ok(manager);
    assert.equal(manager.sample, false);
    assert.equal(manager.reviewCount, 1);
    assert.equal(formatScore(manager.average), "5.0");
    assert.equal(manager.reviews[0].body, draft.body);
    assert.equal(queries.listManagerOptions().length, 1);

    const again = validateReview({ ...draft, body: "A second note about how decisions are explained to the team." });
    assert.equal(again.ok, true);
    if (!again.ok) return;
    const extra = queries.insertReview(again.value);
    assert.equal(extra.ok, true);
    if (!extra.ok) return;
    assert.equal(extra.managerId, first.managerId);
    assert.equal(queries.listManagerOptions().length, 1);
  } finally {
    db.resetDbForTests();
    fs.rmSync(file, { force: true });
  }
});
});
