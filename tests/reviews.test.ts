import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, test } from "node:test";
import { analysisChartSpecs } from "../lib/analysis-chart-images";
import { formatScore, groupReviewsByYear } from "../lib/format";
import { TAGS } from "../lib/tags";
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
    const byName = new Map(feed.map((manager) => [manager.name, manager]));
    const expectManager = (name: string, score: string, divisionId: string) => {
      const manager = byName.get(name);
      assert.ok(manager, name);
      assert.equal(manager.average === null ? null : formatScore(manager.average), score);
      assert.equal(manager.sample, true);
      assert.equal(manager.divisionId, divisionId);
      return manager;
    };
    const thabo = expectManager("Thabo Molefe", "1.0", "pyrometallurgy");
    expectManager("Lerato Nkosi", "5.0", "hydrometallurgy");
    expectManager("Ayesha Patel", "5.0", "analytical-chemistry");
    const johan = expectManager("Johan Botha", "1.3", "mineral-processing");
    expectManager("Sipho Dlamini", "3.5", "measurement-and-control");
    assert.equal(byName.get("Karabo Mokoena")?.reviewCount, 0);
    assert.equal(byName.get("Anele Dlamini")?.reviewCount, 0);
    assert.equal(byName.get("Pumeza Nkosi")?.reviewCount, 0);
    assert.ok(thabo.latest);
    assert.ok(johan.latest);
    assert.deepEqual(thabo.latest.tags, ["micromanages", "takes-credit", "blames-team"]);
    assert.deepEqual(johan.latest.tags, ["low-ego", "poor-communication", "plays-favourites"]);
    assert.equal(queries.listFeed("analytical-chemistry", "laboratory").length, 1);
    assert.equal(queries.listFeed("pyrometallurgy").length, 5);
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
    assert.equal(report.reviewCount, 134);
    assert.equal(feed.length, 48);
    assert.equal(report.divisions.filter((division) => division.managerCount > 0).length, 19);
    assert.equal(report.divisions.filter((division) => division.reviewCount > 0).length, 19);
    assert.equal(report.divisions.find((division) => division.divisionId === "human-resources")?.reviewCount, 6);
    assert.equal(report.divisions.find((division) => division.divisionId === "human-resources")?.managerCount, 3);
    assert.equal(report.divisions.find((division) => division.divisionId === "pyrometallurgy")?.reviewCount, 12);
    assert.deepEqual(
      report.attention.map((division) => division.divisionId),
      ["sheq-and-erm", "campus-and-maintenance", "ict", "sample-management"],
    );
    assert.deepEqual(
      report.ratingMix.map((bucket) => bucket.count),
      [17, 31, 25, 31, 30],
    );
    const usedTags = new Set(report.tagCounts.map((tag) => tag.id));
    assert.deepEqual(
      TAGS.map((tag) => tag.id).filter((id) => !usedTags.has(id)),
      [],
    );
    for (const column of queries.reviewTableColumns()) {
      assert.equal(/author|user|email|employee|staff|ip|agent|session|device|laptop|login|identity/i.test(column), false);
    }
  } finally {
    db.resetDbForTests();
    fs.rmSync(file, { force: true });
  }
});

test("demo seed fills missing examples and leaves posted or hidden reviews alone", async () => {
  const file = tempDb();
  const { db, queries } = await openDb(file, true);
  const { ensureDemoSeed } = await import("../lib/seed");
  try {
    db.getDb()
      .prepare(
        "INSERT INTO managers (id, name, title, division, sample, created_at) VALUES (?, ?, ?, ?, 0, ?)",
      )
      .run("mgr-posted", "Posted Manager", "Team Lead", "finance", "2026-10-01");

    ensureDemoSeed(db.getDb());
    assert.equal(queries.listOrganisation().length, 49);
    const posted = queries.getManager("mgr-posted", {
      divisionId: "finance",
      orgWide: false,
      includeBodies: false,
    });
    assert.equal(posted?.sample, false);
    assert.equal(posted?.name, "Posted Manager");

    const thabo = queries.getManager("mgr-thabo", {
      divisionId: "pyrometallurgy",
      orgWide: false,
      includeBodies: true,
    });
    assert.ok(thabo);
    const targetId = thabo.reviews[0]?.id;
    assert.ok(targetId);
    assert.equal(queries.setReviewHidden(targetId, true).ok, true);

    const reviewCount = queries.organisationReport().reviewCount;
    ensureDemoSeed(db.getDb());
    assert.equal(queries.listOrganisation().length, 49);
    assert.equal(queries.organisationReport().reviewCount, reviewCount);
    const stillHidden = queries.getManager("mgr-thabo", {
      divisionId: "human-resources",
      orgWide: true,
      includeBodies: true,
    });
    assert.equal(stillHidden?.reviews.find((item) => item.id === targetId)?.hidden, true);

    db.getDb().prepare("DELETE FROM review_tags WHERE review_id LIKE 'rev-nomsa-%'").run();
    db.getDb().prepare("DELETE FROM reviews WHERE manager_id = 'mgr-nomsa'").run();
    db.getDb().prepare("DELETE FROM managers WHERE id = 'mgr-nomsa'").run();
    assert.equal(
      queries.getManager("mgr-nomsa", { divisionId: "pyrometallurgy", orgWide: false, includeBodies: false }),
      null,
    );
    ensureDemoSeed(db.getDb());
    const restored = queries.getManager("mgr-nomsa", {
      divisionId: "pyrometallurgy",
      orgWide: false,
      includeBodies: true,
    });
    assert.equal(restored?.name, "Nomsa Mahlangu");
    assert.equal(restored?.sample, true);
    assert.equal(restored?.reviewCount, 4);
    assert.equal(queries.getManager("mgr-posted", {
      divisionId: "finance",
      orgWide: false,
      includeBodies: false,
    })?.sample, false);
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
      policyAccepted: true,
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
    assert.deepEqual(columns, ["id", "manager_id", "rating", "body", "created_at", "hidden"]);
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
    assert.equal(manager.reviews[0].hidden, false);
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
      .prepare(
        "INSERT INTO reviews (id, manager_id, rating, body, created_at, hidden) VALUES (?, ?, ?, ?, ?, 0)",
      );
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

test("hiding a review removes it from public counts and feeds; restore brings it back", async () => {
  const file = tempDb();
  const { db, queries } = await openDb(file, true);
  try {
    db.getDb()
      .prepare(
        "INSERT INTO managers (id, name, title, division, sample, created_at) VALUES (?, ?, ?, ?, 0, ?)",
      )
      .run("mgr-policy", "Policy Manager", "Team Lead", "pyrometallurgy", "2026-01-01");

    const first = validateReview({
      managerId: "mgr-policy",
      rating: 2,
      body: "First note about decisions that stay with the team when something slips.",
      tags: ["blames-team"],
      honeypot: "",
      policyAccepted: true,
    });
    const second = validateReview({
      managerId: "mgr-policy",
      rating: 4,
      body: "Second note about clear plans and fair leave for people on the floor.",
      tags: ["fair", "clear-communicator"],
      honeypot: "",
      policyAccepted: true,
    });
    assert.equal(first.ok, true);
    assert.equal(second.ok, true);
    if (!first.ok || !second.ok) return;

    assert.equal(queries.insertReview(first.value, "pyrometallurgy").ok, true);
    assert.equal(queries.insertReview(second.value, "pyrometallurgy").ok, true);

    const publicAccess = { divisionId: "pyrometallurgy", orgWide: false, includeBodies: false };
    const hrAccess = { divisionId: "human-resources", orgWide: true, includeBodies: true };

    const before = queries.getManager("mgr-policy", publicAccess);
    assert.ok(before);
    assert.equal(before.reviewCount, 2);
    assert.equal(before.reviews.length, 2);
    assert.equal(queries.listFeed("pyrometallurgy")[0]?.reviewCount, 2);
    assert.equal(queries.organisationReport().divisions.find((d) => d.divisionId === "pyrometallurgy")?.reviewCount, 2);
    assert.ok(
      (queries.organisationReport().divisions.find((d) => d.divisionId === "pyrometallurgy")?.tagCounts ?? []).some(
        (tag) => tag.id === "blames-team" && tag.count === 1,
      ),
    );

    const targetId = before.reviews.find((review) => review.rating === 2)?.id;
    assert.ok(targetId);
    const hidden = queries.setReviewHidden(targetId, true);
    assert.equal(hidden.ok, true);

    const publicAfterHide = queries.getManager("mgr-policy", publicAccess);
    assert.ok(publicAfterHide);
    assert.equal(publicAfterHide.reviewCount, 1);
    assert.equal(publicAfterHide.reviews.length, 1);
    assert.equal(publicAfterHide.reviews[0].rating, 4);
    assert.equal(publicAfterHide.tagCounts.some((tag) => tag.id === "blames-team"), false);
    assert.equal(queries.listFeed("pyrometallurgy")[0]?.reviewCount, 1);
    assert.equal(formatScore(queries.listFeed("pyrometallurgy")[0]?.average ?? 0), "4.0");
    assert.equal(queries.organisationReport().divisions.find((d) => d.divisionId === "pyrometallurgy")?.reviewCount, 1);
    assert.equal(
      queries.organisationReport().divisions.find((d) => d.divisionId === "pyrometallurgy")?.tagCounts.some(
        (tag) => tag.id === "blames-team",
      ),
      false,
    );

    const hrAfterHide = queries.getManager("mgr-policy", hrAccess);
    assert.ok(hrAfterHide);
    assert.equal(hrAfterHide.reviewCount, 1);
    assert.equal(hrAfterHide.reviews.length, 2);
    assert.equal(hrAfterHide.reviews.filter((review) => review.hidden).length, 1);
    assert.match(hrAfterHide.reviews.find((review) => review.hidden)?.body ?? "", /First note/);

    const restored = queries.setReviewHidden(targetId, false);
    assert.equal(restored.ok, true);
    const publicAfterRestore = queries.getManager("mgr-policy", publicAccess);
    assert.ok(publicAfterRestore);
    assert.equal(publicAfterRestore.reviewCount, 2);
    assert.equal(publicAfterRestore.reviews.length, 2);
    assert.equal(queries.listFeed("pyrometallurgy")[0]?.reviewCount, 2);
    assert.equal(queries.organisationReport().divisions.find((d) => d.divisionId === "pyrometallurgy")?.reviewCount, 2);
    assert.ok(
      (queries.organisationReport().divisions.find((d) => d.divisionId === "pyrometallurgy")?.tagCounts ?? []).some(
        (tag) => tag.id === "blames-team" && tag.count === 1,
      ),
    );
  } finally {
    db.resetDbForTests();
    fs.rmSync(file, { force: true });
  }
});

test("a custom two-word trait is stored and counted with preset traits", async () => {
  const file = tempDb();
  const { db, queries } = await openDb(file, true);
  try {
    db.getDb()
      .prepare(
        "INSERT INTO managers (id, name, title, division, sample, created_at) VALUES (?, ?, ?, ?, 0, ?)",
      )
      .run("mgr-custom", "Custom Manager", "Team Lead", "pyrometallurgy", "2026-11-01");

    const rejected = validateReview({
      managerId: "mgr-custom",
      rating: 4,
      body: "She keeps promises and stays fair when the week gets busy.",
      tags: ["takes all credit"],
      honeypot: "",
      policyAccepted: true,
    });
    assert.equal(rejected.ok, false);
    if (!rejected.ok && !rejected.spam) assert.equal(rejected.error, "Use at most two words.");

    const accepted = validateReview({
      managerId: "mgr-custom",
      rating: 4,
      body: "She keeps promises and stays fair when the week gets busy.",
      tags: ["  Keeps   promises  ", "Fair"],
      honeypot: "",
      policyAccepted: true,
    });
    assert.equal(accepted.ok, true);
    if (!accepted.ok) return;
    assert.deepEqual(accepted.value.tags, ["Keeps promises", "fair"]);

    const saved = queries.insertReview(accepted.value, "pyrometallurgy");
    assert.equal(saved.ok, true);

    const manager = queries.getManager("mgr-custom", {
      divisionId: "pyrometallurgy",
      orgWide: false,
      includeBodies: true,
    });
    assert.ok(manager);
    assert.deepEqual(manager.reviews[0]?.tags, ["fair", "Keeps promises"]);
    assert.deepEqual(manager.tagCounts, [
      { id: "fair", count: 1 },
      { id: "Keeps promises", count: 1 },
    ]);

    const report = queries.organisationReport();
    assert.ok(report.tagCounts.some((tag) => tag.id === "Keeps promises" && tag.count === 1));
    assert.ok(
      report.divisions
        .find((division) => division.divisionId === "pyrometallurgy")
        ?.tagCounts.some((tag) => tag.id === "Keeps promises" && tag.count === 1),
    );
    const frequency = analysisChartSpecs(report).find((spec) => spec.title === "Trait frequency");
    const customBar = frequency?.bars.find((bar) => bar.label === "Keeps promises");
    assert.ok(customBar);
    assert.equal(customBar.color, "#5e828d");
    assert.equal(
      queries.listReviewsForExport("pyrometallurgy").some((row) => row.traits.includes("Keeps promises")),
      true,
    );
  } finally {
    db.resetDbForTests();
    fs.rmSync(file, { force: true });
  }
});
});
