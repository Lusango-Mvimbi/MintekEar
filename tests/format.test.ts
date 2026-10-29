import assert from "node:assert/strict";
import test from "node:test";
import {
  formatScore,
  groupReviewsByYear,
  initials,
  reviewDate,
  reviewYear,
  timeAgo,
  verdictLabel,
} from "../lib/format";

test("scores use one decimal and a verdict", () => {
  assert.equal(formatScore(1), "1.0");
  assert.equal(formatScore(1.333), "1.3");
  assert.equal(formatScore(5), "5.0");
  assert.equal(verdictLabel(1.3), "Avoid");
  assert.equal(verdictLabel(2.45), "Mixed");
  assert.equal(verdictLabel(3.9), "Mixed");
  assert.equal(verdictLabel(4), "Great manager");
});

test("initials use the first and last name", () => {
  assert.equal(initials("Thabo Molefe"), "TM");
  assert.equal(initials("  Johan   Botha "), "JB");
  assert.equal(initials("Ayesha"), "AY");
});

test("dates stay in whole days", () => {
  const now = Date.parse("2026-10-29T10:00:00.000Z");
  assert.equal(reviewDate(now), "2026-10-29");
  assert.equal(timeAgo("2026-10-29", now), "Today");
  assert.equal(timeAgo("2026-10-29T10:00:00.000Z", now), "Today");
  assert.equal(timeAgo("2026-10-28", now), "1d ago");
  assert.equal(timeAgo("2026-10-26", now), "3d ago");
});

test("reviews group by year with the latest year first", () => {
  assert.equal(reviewYear("2025-12-31"), 2025);
  assert.equal(reviewYear("2026-01-01T12:00:00.000Z"), 2026);
  assert.deepEqual(
    groupReviewsByYear([
      { id: "a", createdAt: "2026-03-01" },
      { id: "b", createdAt: "2026-01-15" },
      { id: "c", createdAt: "2025-11-02" },
      { id: "d", createdAt: "2024-06-01" },
    ]).map((group) => [group.year, group.reviews.map((review) => review.id)]),
    [
      [2026, ["a", "b"]],
      [2025, ["c"]],
      [2024, ["d"]],
    ],
  );
});
