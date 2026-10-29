import assert from "node:assert/strict";
import test from "node:test";
import { validateReview, type ReviewDraft } from "../lib/validation";

function draft(overrides: Partial<ReviewDraft> = {}): ReviewDraft {
  return {
    managerId: "mgr-thabo",
    rating: 4,
    body: "She shares credit and the plan for the week is clear.",
    tags: ["fair", "clear-communicator"],
    honeypot: "",
    ...overrides,
  };
}

test("accepts an anonymous review of a listed manager", () => {
  const result = validateReview(draft());
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.managerId, "mgr-thabo");
    assert.deepEqual(result.value.tags, ["fair", "clear-communicator"]);
  }
});

test("rejects a review that does not name a listed manager", () => {
  const result = validateReview(draft({ managerId: "  " }));
  assert.equal(result.ok, false);
  if (!result.ok && !result.spam) assert.match(result.error, /division/);
});

test("rejects a short review, a bad score, and an unknown trait", () => {
  assert.equal(validateReview(draft({ body: "Too short" })).ok, false);
  assert.equal(validateReview(draft({ rating: 0 })).ok, false);
  const unknown = validateReview(draft({ tags: ["invented"] }));
  assert.equal(unknown.ok, false);
  if (!unknown.ok && !unknown.spam) assert.match(unknown.error, /traits/);
});

test("treats a filled honeypot as spam", () => {
  const result = validateReview(draft({ honeypot: "https://spam.example" }));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.spam, true);
});
