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
    const feed = queries.listOrganisation();
    assert.deepEqual(
      feed.map((manager) => [manager.name, formatScore(manager.average), manager.sample, manager.divisionId]),
      [
        ["Thabo Molefe", "1.0", true, "pyrometallurgy"],
        ["Lerato Nkosi", "5.0", true, "hydrometallurgy"],
        ["Ayesha Patel", "5.0", true, "analytical-chemistry"],
        ["Johan Botha", "1.3", true, "mineral-processing"],
        ["Sipho Dlamini", "3.5", true, "measurement-and-control"],
      ],
    );
    assert.deepEqual(feed[0].latest.tags, ["micromanages", "takes-credit", "blames-team"]);
    assert.deepEqual(feed[3].latest.tags, ["low-ego", "poor-communication", "plays-favourites"]);
    assert.equal(queries.listFeed("analytical-chemistry", "laboratory").length, 1);
    assert.equal(queries.listFeed("pyrometallurgy").length, 1);
    assert.equal(queries.listFeed("pyrometallurgy", "laboratory").length, 0);
    assert.equal(queries.getManager("mgr-thabo", { divisionId: "hydrometallurgy", hr: false }), null);
    assert.equal(queries.getManager("mgr-thabo", { divisionId: "pyrometallurgy", hr: false })?.name, "Thabo Molefe");
    assert.equal(queries.getManager("mgr-thabo", { divisionId: "human-resources", hr: true })?.name, "Thabo Molefe");
    const report = queries.organisationReport();
    assert.equal(report.divisions.find((division) => division.divisionId === "human-resources")?.reviewCount, 0);
    assert.equal(report.divisions.find((division) => division.divisionId === "pyrometallurgy")?.reviewCount, 2);
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

    const first = queries.insertReview(valid.value, "pyrometallurgy");
    const second = queries.insertReview(valid.value, "pyrometallurgy");
    assert.equal(first.ok, true);
    assert.equal(second.ok, false);
    if (!first.ok) return;

    const columns = queries.reviewTableColumns();
    assert.deepEqual(columns, ["id", "manager_id", "rating", "body", "created_at"]);
    for (const column of columns) {
      assert.equal(/author|user|email|employee|staff|ip|agent|session|device|laptop|login|identity/i.test(column), false);
    }

    const access = { divisionId: "pyrometallurgy", hr: false };
    const manager = queries.getManager(first.managerId, access);
    assert.ok(manager);
    assert.equal(manager.sample, false);
    assert.equal(manager.divisionId, "pyrometallurgy");
    assert.equal(manager.reviewCount, 1);
    assert.equal(formatScore(manager.average), "5.0");
    assert.equal(manager.reviews[0].body, draft.body);
    assert.match(manager.reviews[0].createdAt, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(queries.listManagerOptions("pyrometallurgy").length, 1);
    assert.equal(queries.getManager(first.managerId, { divisionId: "finance", hr: false }), null);

    const again = validateReview({ ...draft, body: "A second note about how decisions are explained to the team." });
    assert.equal(again.ok, true);
    if (!again.ok) return;
    const extra = queries.insertReview(again.value, "pyrometallurgy");
    assert.equal(extra.ok, true);
    if (!extra.ok) return;
    assert.equal(extra.managerId, first.managerId);
    assert.equal(queries.listManagerOptions("pyrometallurgy").length, 1);

    const otherDivision = queries.insertReview(valid.value, "finance");
    assert.equal(otherDivision.ok, true);
    if (!otherDivision.ok) return;
    assert.notEqual(otherDivision.managerId, first.managerId);
    assert.equal(queries.listFeed("finance").length, 1);
    assert.equal(queries.listFeed("pyrometallurgy").length, 1);
  } finally {
    db.resetDbForTests();
    fs.rmSync(file, { force: true });
  }
});
});
