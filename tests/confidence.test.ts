import assert from "node:assert/strict";
import test from "node:test";
import {
  ATTENTION_MIN_REVIEWS,
  enoughReviewsForAttention,
  scoreConfidence,
} from "../lib/confidence";

test("score confidence follows product-rating sample sizes", () => {
  assert.equal(scoreConfidence(0).level, "thin");
  assert.match(scoreConfidence(1).label, /thin sample/i);
  assert.equal(scoreConfidence(2).level, "thin");
  assert.equal(scoreConfidence(ATTENTION_MIN_REVIEWS).level, "building");
  assert.equal(scoreConfidence(9).level, "building");
  assert.equal(scoreConfidence(10).level, "established");
  assert.match(scoreConfidence(12).caption, /confidence/i);
});

test("attention needs enough reviews", () => {
  assert.equal(enoughReviewsForAttention(0), false);
  assert.equal(enoughReviewsForAttention(2), false);
  assert.equal(enoughReviewsForAttention(ATTENTION_MIN_REVIEWS), true);
});
