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
    policyAccepted: true,
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

test("rejects a short review and a bad score", () => {
  assert.equal(validateReview(draft({ body: "Too short" })).ok, false);
  assert.equal(validateReview(draft({ rating: 0 })).ok, false);
});

test("accepts a custom trait of one or two words and collapses spaces", () => {
  const result = validateReview(draft({ tags: ["  Keeps   promises  ", "Punctual", "punctual"] }));
  assert.equal(result.ok, true);
  if (result.ok) assert.deepEqual(result.value.tags, ["Keeps promises", "Punctual"]);
});

test("maps a typed preset, including a three-word label, onto its id", () => {
  const result = validateReview(draft({ tags: ["Clear communicator", "Protects the team", "fair"] }));
  assert.equal(result.ok, true);
  if (result.ok) assert.deepEqual(result.value.tags, ["clear-communicator", "protects-team", "fair"]);
});

test("rejects a custom trait of more than two words", () => {
  const result = validateReview(draft({ tags: ["takes all credit"] }));
  assert.equal(result.ok, false);
  if (!result.ok && !result.spam) assert.equal(result.error, "Use at most two words.");
});

test("rejects an empty or punctuation-only custom trait", () => {
  const empty = validateReview(draft({ tags: ["   "] }));
  assert.equal(empty.ok, false);
  if (!empty.ok && !empty.spam) assert.equal(empty.error, "Enter a trait.");
  const marks = validateReview(draft({ tags: ["???"] }));
  assert.equal(marks.ok, false);
  if (!marks.ok && !marks.spam) assert.equal(marks.error, "Use letters and numbers.");
});

test("rejects a custom trait that is too long", () => {
  const result = validateReview(draft({ tags: ["Supercalifragilisticexpialidocious leader"] }));
  assert.equal(result.ok, false);
  if (!result.ok && !result.spam) assert.equal(result.error, "That trait is too long.");
});

test("rejects more than six traits", () => {
  const result = validateReview(
    draft({ tags: ["fair", "supportive", "low-ego", "gives-feedback", "Punctual", "Kind", "Calm"] }),
  );
  assert.equal(result.ok, false);
  if (!result.ok && !result.spam) assert.equal(result.error, "Choose up to 6 traits.");
});

test("treats a filled honeypot as spam", () => {
  const result = validateReview(draft({ honeypot: "https://spam.example" }));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.spam, true);
});

test("rejects a review when the policy is not accepted", () => {
  const result = validateReview(draft({ policyAccepted: false }));
  assert.equal(result.ok, false);
  if (!result.ok && !result.spam) assert.match(result.error, /policy/);
});
