import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, test } from "node:test";
import { parseDivisionParam } from "../lib/divisions";

function tempDb(): string {
  return path.join(
    os.tmpdir(),
    `mintekear-graphs-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}.db`,
  );
}

describe("analysis graph settings", { concurrency: 1 }, () => {
  test("defaults enable a useful set and admins can change visibility", async () => {
    const file = tempDb();
    process.env.MINTEKEAR_DB = file;
    process.env.MINTEKEAR_SKIP_SEED = "1";
    const db = await import("../lib/db");
    db.resetDbForTests();
    const graphs = await import("../lib/analysis-graphs");
    try {
      const visibility = graphs.getAnalysisGraphVisibility();
      assert.equal(visibility.overview, true);
      assert.equal(visibility["division-scores"], true);
      assert.equal(visibility["rating-mix"], true);
      assert.equal(visibility.attention, true);
      assert.equal(visibility.traits, true);
      assert.equal(visibility["division-table"], false);
      assert.equal(visibility.managers, true);

      const updated = graphs.updateAnalysisGraphVisibility(["overview", "traits"]);
      assert.equal(updated.ok, true);
      assert.equal(updated.visibility.overview, true);
      assert.equal(updated.visibility.traits, true);
      assert.equal(updated.visibility["division-scores"], false);
      assert.equal(updated.visibility.managers, false);

      const again = graphs.getAnalysisGraphVisibility();
      assert.equal(again.overview, true);
      assert.equal(again.traits, true);
      assert.equal(again.attention, false);

      // Unknown ids are ignored; known graphs stay off when omitted.
      const cleared = graphs.updateAnalysisGraphVisibility(["not-a-graph"]);
      assert.equal(cleared.ok, true);
      assert.equal(cleared.visibility.overview, false);
      assert.equal(cleared.visibility.traits, false);
    } finally {
      db.resetDbForTests();
      fs.rmSync(file, { force: true });
    }
  });

  test("organisation report includes anonymous rating mix", async () => {
    const file = tempDb();
    process.env.MINTEKEAR_DB = file;
    process.env.MINTEKEAR_SKIP_SEED = "0";
    const db = await import("../lib/db");
    db.resetDbForTests();
    const queries = await import("../lib/queries");
    try {
      const report = queries.organisationReport();
      assert.equal(report.ratingMix.length, 5);
      assert.equal(
        report.ratingMix.reduce((sum, bucket) => sum + bucket.count, 0),
        report.reviewCount,
      );
      assert.ok(report.ratingMix.every((bucket) => bucket.rating >= 1 && bucket.rating <= 5));
      assert.equal(report.scopeDivisionId, null);
    } finally {
      db.resetDbForTests();
      fs.rmSync(file, { force: true });
    }
  });

  test("organisation report filters to one division and leaves unknown filters on all", async () => {
    const file = tempDb();
    process.env.MINTEKEAR_DB = file;
    process.env.MINTEKEAR_SKIP_SEED = "0";
    const db = await import("../lib/db");
    db.resetDbForTests();
    const queries = await import("../lib/queries");
    try {
      const all = queries.organisationReport();
      const pyroAll = all.divisions.find((division) => division.divisionId === "pyrometallurgy");
      const sheqAll = all.divisions.find((division) => division.divisionId === "sheq-and-erm");
      assert.ok(pyroAll);
      assert.ok(sheqAll);
      assert.ok(pyroAll.reviewCount > 0);
      assert.ok(all.reviewCount > pyroAll.reviewCount);
      assert.equal(all.scopeDivisionId, null);

      const pyro = queries.organisationReport("pyrometallurgy");
      assert.equal(pyro.scopeDivisionId, "pyrometallurgy");
      assert.equal(pyro.reviewCount, pyroAll.reviewCount);
      assert.equal(pyro.average, pyroAll.average);
      assert.equal(pyro.divisions.length, 1);
      assert.equal(pyro.divisions[0]?.managerCount, pyroAll.managerCount);
      assert.deepEqual(
        pyro.divisions[0]?.managers.map((manager) => manager.id),
        pyroAll.managers.map((manager) => manager.id),
      );
      assert.ok(pyro.divisions[0]?.managers.every((manager) => manager.divisionId === "pyrometallurgy"));
      assert.deepEqual(pyro.divisions[0]?.tagCounts, pyroAll.tagCounts);
      assert.deepEqual(pyro.tagCounts, pyroAll.tagCounts);
      assert.equal(
        pyro.ratingMix.reduce((sum, bucket) => sum + bucket.count, 0),
        pyro.reviewCount,
      );
      for (const bucket of pyro.ratingMix) {
        const org = all.ratingMix.find((item) => item.rating === bucket.rating);
        assert.ok(org);
        assert.ok(bucket.count <= org.count);
      }
      assert.equal(
        pyro.attention.every((division) => division.divisionId === "pyrometallurgy"),
        true,
      );

      const sheq = queries.organisationReport(" sheq-and-erm ");
      assert.equal(sheq.scopeDivisionId, "sheq-and-erm");
      assert.equal(sheq.reviewCount, sheqAll.reviewCount);
      assert.equal(sheq.average, sheqAll.average);
      assert.deepEqual(
        sheq.attention.map((division) => division.divisionId),
        all.attention.some((division) => division.divisionId === "sheq-and-erm") ? ["sheq-and-erm"] : [],
      );

      assert.equal(queries.organisationReport(null).reviewCount, all.reviewCount);
      assert.equal(queries.organisationReport(undefined).divisions.length, all.divisions.length);
      assert.equal(queries.organisationReport("").scopeDivisionId, null);
      assert.equal(queries.organisationReport("not-a-division").reviewCount, all.reviewCount);
      assert.equal(queries.organisationReport("Pyrometallurgy").divisions.length, all.divisions.length);
    } finally {
      db.resetDbForTests();
      fs.rmSync(file, { force: true });
    }
  });

  test("a division filter ignores other divisions and hidden reviews", async () => {
    const file = tempDb();
    process.env.MINTEKEAR_DB = file;
    process.env.MINTEKEAR_SKIP_SEED = "1";
    const db = await import("../lib/db");
    db.resetDbForTests();
    const queries = await import("../lib/queries");
    try {
      const database = db.getDb();
      const insertManager = database.prepare(
        "INSERT INTO managers (id, name, title, division, sample, created_at) VALUES (?, ?, ?, ?, 0, ?)",
      );
      insertManager.run("mgr-filter-finance", "Finance Lead", "Manager", "finance", "2026-01-01");
      insertManager.run("mgr-filter-ict", "ICT Lead", "Manager", "ict", "2026-01-01");
      const insertReview = database.prepare(
        "INSERT INTO reviews (id, manager_id, rating, body, created_at, hidden) VALUES (?, ?, ?, ?, ?, ?)",
      );
      insertReview.run("rev-filter-visible", "mgr-filter-finance", 2, "Visible finance note about plans.", "2026-02-01", 0);
      insertReview.run("rev-filter-hidden", "mgr-filter-finance", 5, "Hidden finance note about plans.", "2026-02-02", 1);
      insertReview.run("rev-filter-other", "mgr-filter-ict", 1, "ICT note that stays in ICT.", "2026-02-03", 0);
      const insertTag = database.prepare("INSERT INTO review_tags (review_id, tag) VALUES (?, ?)");
      insertTag.run("rev-filter-visible", "blames-team");
      insertTag.run("rev-filter-hidden", "supportive");
      insertTag.run("rev-filter-other", "micromanages");

      const finance = queries.organisationReport("finance");
      assert.equal(finance.scopeDivisionId, "finance");
      assert.equal(finance.reviewCount, 1);
      assert.equal(finance.average, 2);
      assert.deepEqual(
        finance.ratingMix.map((bucket) => bucket.count),
        [0, 1, 0, 0, 0],
      );
      assert.deepEqual(finance.tagCounts, [{ id: "blames-team", count: 1 }]);
      assert.equal(finance.divisions.length, 1);
      assert.equal(finance.divisions[0]?.managerCount, 1);
      assert.equal(finance.divisions[0]?.managers[0]?.id, "mgr-filter-finance");
      assert.equal(finance.divisions[0]?.managers.some((manager) => manager.divisionId !== "finance"), false);
      assert.deepEqual(
        finance.attention.map((division) => division.divisionId),
        ["finance"],
      );

      const ict = queries.organisationReport("ict");
      assert.equal(ict.reviewCount, 1);
      assert.equal(ict.average, 1);
      assert.deepEqual(ict.tagCounts, [{ id: "micromanages", count: 1 }]);
      assert.equal(ict.divisions[0]?.managers[0]?.id, "mgr-filter-ict");
      assert.equal(ict.tagCounts.some((tag) => tag.id === "blames-team"), false);

      const all = queries.organisationReport();
      assert.equal(all.scopeDivisionId, null);
      assert.equal(all.reviewCount, 2);
      assert.equal(all.ratingMix.find((bucket) => bucket.rating === 5)?.count, 0);
      assert.equal(all.divisions.filter((division) => division.reviewCount > 0).length, 2);
    } finally {
      db.resetDbForTests();
      fs.rmSync(file, { force: true });
    }
  });
});

test("analysis division param keeps known division ids only", () => {
  assert.equal(parseDivisionParam(undefined), null);
  assert.equal(parseDivisionParam(null), null);
  assert.equal(parseDivisionParam(""), null);
  assert.equal(parseDivisionParam("   "), null);
  assert.equal(parseDivisionParam("pyrometallurgy"), "pyrometallurgy");
  assert.equal(parseDivisionParam("  finance  "), "finance");
  assert.equal(parseDivisionParam(["human-resources", "finance"]), "human-resources");
  assert.equal(parseDivisionParam("not-a-division"), null);
  assert.equal(parseDivisionParam("Pyrometallurgy"), null);
});
