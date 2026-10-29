import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, test } from "node:test";
import { formatScore, groupReviewsByYear } from "../lib/format";
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
      feed.map((manager) => [
        manager.name,
        manager.average === null ? null : formatScore(manager.average),
        manager.sample,
        manager.divisionId,
      ]),
      [
        ["Thabo Molefe", "1.0", true, "pyrometallurgy"],
        ["Lerato Nkosi", "5.0", true, "hydrometallurgy"],
        ["Ayesha Patel", "5.0", true, "analytical-chemistry"],
        ["Johan Botha", "1.3", true, "mineral-processing"],
        ["Sipho Dlamini", "3.5", true, "measurement-and-control"],
      ],
    );
    assert.ok(feed[0].latest);
    assert.ok(feed[3].latest);
    assert.deepEqual(feed[0].latest.tags, ["micromanages", "takes-credit", "blames-team"]);
    assert.deepEqual(feed[3].latest.tags, ["low-ego", "poor-communication", "plays-favourites"]);
    assert.equal(queries.listFeed("analytical-chemistry", "laboratory").length, 1);
    assert.equal(queries.listFeed("pyrometallurgy").length, 1);
    assert.equal(queries.listFeed("pyrometallurgy", "laboratory").length, 0);
    assert.equal(
      queries.getManager("mgr-thabo", { divisionId: "hydrometallurgy", orgWide: false, includeBodies: false }),
      null,
    );
    assert.equal(
      queries.getManager("mgr-thabo", { divisionId: "pyrometallurgy", orgWide: false, includeBodies: false })?.name,
      "Thabo Molefe",
    );
    assert.equal(
      queries.getManager("mgr-thabo", { divisionId: "human-resources", orgWide: true, includeBodies: true })?.name,
      "Thabo Molefe",
    );
    assert.equal(
      queries.getManager("mgr-thabo", { divisionId: "pyrometallurgy", orgWide: false, includeBodies: false })?.reviews[0]
        .body,
      "",
    );
    assert.match(
      queries.getManager("mgr-thabo", { divisionId: "pyrometallurgy", orgWide: false, includeBodies: true })?.reviews[0]
        .body ?? "",
      /credit|team|work/i,
    );
    const report = queries.organisationReport();
    assert.equal(report.divisions.find((division) => division.divisionId === "human-resources")?.reviewCount, 0);
    assert.equal(report.divisions.find((division) => division.divisionId === "pyrometallurgy")?.reviewCount, 2);
  } finally {
    db.resetDbForTests();
    fs.rmSync(file, { force: true });
  }
});

test("a review can only be posted for a manager already in that division", async () => {
  const file = tempDb();
  const { db, queries } = await openDb(file, true);
  try {
    db.getDb()
      .prepare(
        "INSERT INTO managers (id, name, title, division, sample, created_at) VALUES (?, ?, ?, ?, 0, ?)",
      )
      .run("mgr-naledi", "Naledi Khumalo", "Engineering Manager", "pyrometallurgy", "2026-10-29");

    const draft: ReviewDraft = {
      managerId: "mgr-naledi",
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
    assert.equal(first.managerId, "mgr-naledi");

    const columns = queries.reviewTableColumns();
    assert.deepEqual(columns, ["id", "manager_id", "rating", "body", "created_at"]);
    for (const column of columns) {
      assert.equal(/author|user|email|employee|staff|ip|agent|session|device|laptop|login|identity/i.test(column), false);
    }

    const access = { divisionId: "pyrometallurgy", orgWide: false, includeBodies: true };
    const manager = queries.getManager(first.managerId, access);
    assert.ok(manager);
    assert.equal(manager.sample, false);
    assert.equal(manager.divisionId, "pyrometallurgy");
    assert.equal(manager.reviewCount, 1);
    assert.ok(manager.average !== null);
    assert.equal(formatScore(manager.average), "5.0");
    assert.equal(manager.reviews[0].body, draft.body);
    assert.match(manager.reviews[0].createdAt, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(queries.listManagerOptions("pyrometallurgy").length, 1);
    assert.equal(
      queries.getManager(first.managerId, { divisionId: "finance", orgWide: false, includeBodies: false }),
      null,
    );

    const again = validateReview({ ...draft, body: "A second note about how decisions are explained to the team." });
    assert.equal(again.ok, true);
    if (!again.ok) return;
    const extra = queries.insertReview(again.value, "pyrometallurgy");
    assert.equal(extra.ok, true);
    if (!extra.ok) return;
    assert.equal(extra.managerId, first.managerId);
    assert.equal(queries.listManagerOptions("pyrometallurgy").length, 1);

    const otherDivision = queries.insertReview(
      { ...valid.value, body: "A note that should stay inside the writer's own division." },
      "finance",
    );
    assert.equal(otherDivision.ok, false);
    assert.equal(queries.listFeed("finance").length, 0);
    assert.equal(queries.listFeed("pyrometallurgy").length, 1);
  } finally {
    db.resetDbForTests();
    fs.rmSync(file, { force: true });
  }
});

test("manager reviews stay newest first across years", async () => {
  const file = tempDb();
  const { db, queries } = await openDb(file, true);
  try {
    db.getDb()
      .prepare(
        "INSERT INTO managers (id, name, title, division, sample, created_at) VALUES (?, ?, ?, ?, 0, ?)",
      )
      .run("mgr-years", "Yearly Manager", "Team Lead", "pyrometallurgy", "2024-01-01");

    const insert = db
      .getDb()
      .prepare("INSERT INTO reviews (id, manager_id, rating, body, created_at) VALUES (?, ?, ?, ?, ?)");
    insert.run("rev-old", "mgr-years", 2, "Older note from the previous year about the same team lead.", "2025-06-01");
    insert.run("rev-mid", "mgr-years", 3, "Mid-year note that should sit under the current year heading.", "2026-03-10");
    insert.run("rev-new", "mgr-years", 4, "Latest note for this manager that must appear at the top.", "2026-10-20");

    const manager = queries.getManager("mgr-years", {
      divisionId: "pyrometallurgy",
      orgWide: false,
      includeBodies: true,
    });
    assert.ok(manager);
    assert.deepEqual(
      manager.reviews.map((review) => [review.id, review.createdAt]),
      [
        ["rev-new", "2026-10-20"],
        ["rev-mid", "2026-03-10"],
        ["rev-old", "2025-06-01"],
      ],
    );
    assert.deepEqual(
      groupReviewsByYear(manager.reviews).map((group) => [group.year, group.reviews.map((review) => review.id)]),
      [
        [2026, ["rev-new", "rev-mid"]],
        [2025, ["rev-old"]],
      ],
    );
  } finally {
    db.resetDbForTests();
    fs.rmSync(file, { force: true });
  }
});
});
