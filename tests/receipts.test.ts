import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, test } from "node:test";
import { reviewCycleYear } from "../lib/format";
import { validateReview, type ReviewDraft } from "../lib/validation";

function tempDb(): string {
  return path.join(os.tmpdir(), `mintekear-receipt-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}.db`);
}

async function openDb(file: string) {
  process.env.MINTEKEAR_DB = file;
  process.env.MINTEKEAR_SKIP_SEED = "1";
  const db = await import("../lib/db");
  db.resetDbForTests();
  const queries = await import("../lib/queries");
  const receipts = await import("../lib/receipts");
  return { db, queries, receipts };
}

describe("review receipts", { concurrency: 1 }, () => {
  test("one review per manager per year without storing an author on the review", async () => {
    const file = tempDb();
    const { db, queries, receipts } = await openDb(file);
    try {
      db.getDb()
        .prepare(
          "INSERT INTO managers (id, name, title, division, sample, created_at) VALUES (?, ?, ?, ?, 0, ?)",
        )
        .run("mgr-marcelle", "Marcelle Demo", "Team Lead", "pyrometallurgy", "2026-01-01");

      const draft: ReviewDraft = {
        managerId: "mgr-marcelle",
        rating: 1,
        body: "Too many meetings land on my WFH days and the plan keeps shifting without notice.",
        tags: ["poor-communication"],
        honeypot: "",
        policyAccepted: true,
      };
      const valid = validateReview(draft);
      assert.equal(valid.ok, true);
      if (!valid.ok) return;

      const first = queries.insertReviewWithReceipt(valid.value, "pyrometallurgy", "staff-lusango");
      assert.equal(first.ok, true);

      const again = validateReview({
        ...draft,
        body: "A second attack after a fight should not land on the same manager this year.",
      });
      assert.equal(again.ok, true);
      if (!again.ok) return;
      const second = queries.insertReviewWithReceipt(again.value, "pyrometallurgy", "staff-lusango");
      assert.equal(second.ok, false);
      if (second.ok) return;
      assert.match(second.error, /already reviewed/i);

      const otherPerson = queries.insertReviewWithReceipt(again.value, "pyrometallurgy", "staff-william");
      assert.equal(otherPerson.ok, true);

      assert.equal(receipts.hasReviewReceipt("staff-lusango", "mgr-marcelle"), true);
      assert.equal(receipts.hasReviewReceipt("staff-william", "mgr-marcelle"), true);
      assert.deepEqual(receipts.listReviewedManagerIds("staff-lusango"), ["mgr-marcelle"]);

      for (const column of queries.reviewTableColumns()) {
        assert.equal(/author|user|email|employee|staff|ip|agent|session|device|laptop|login|identity/i.test(column), false);
      }
      assert.deepEqual(receipts.receiptTableColumns().sort(), [
        "completed_on",
        "cycle_year",
        "manager_id",
        "staff_id",
      ]);

      const manager = queries.getManager("mgr-marcelle", {
        divisionId: "pyrometallurgy",
        orgWide: false,
        includeBodies: true,
      });
      assert.equal(manager?.reviewCount, 2);

      const completion = receipts.listReviewCompletion(
        [
          { staffId: "staff-lusango", displayName: "Lusango", divisionId: "pyrometallurgy" },
          { staffId: "staff-open", displayName: "Open", divisionId: "pyrometallurgy" },
        ],
        reviewCycleYear(),
      );
      assert.equal(completion.find((row) => row.staffId === "staff-lusango")?.hasPosted, true);
      assert.equal(completion.find((row) => row.staffId === "staff-open")?.hasPosted, false);
    } finally {
      db.resetDbForTests();
      fs.rmSync(file, { force: true });
    }
  });
});
