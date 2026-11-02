import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, test } from "node:test";

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
    } finally {
      db.resetDbForTests();
      fs.rmSync(file, { force: true });
    }
  });
});
