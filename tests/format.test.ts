import assert from "node:assert/strict";
import test from "node:test";
import { formatScore, initials, timeAgo, verdictLabel } from "../lib/format";

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

test("relative time matches the feed", () => {
  const now = Date.parse("2026-10-29T10:00:00.000Z");
  assert.equal(timeAgo(new Date(now - 30_000).toISOString(), now), "Just now");
  assert.equal(timeAgo(new Date(now - 60_000).toISOString(), now), "1m ago");
  assert.equal(timeAgo("2026-10-29T09:00:00.000Z", now), "1h ago");
  assert.equal(timeAgo("2026-10-28T10:00:00.000Z", now), "1d ago");
  assert.equal(timeAgo("2026-10-26T10:00:00.000Z", now), "3d ago");
});
