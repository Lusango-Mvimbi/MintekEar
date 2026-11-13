/**
 * Sample-size confidence for manager scores.
 * Online product ratings have the same issue: one review is noisy; many agreeing reviews are not.
 */

export type ConfidenceLevel = "thin" | "building" | "established";

export type ScoreConfidence = {
  level: ConfidenceLevel;
  /** Short label next to the score. */
  label: string;
  /** One line for Analysis and manager pages. */
  caption: string;
};

/** Fewer than this many visible reviews keeps a manager out of "Needs attention" certainty. */
export const ATTENTION_MIN_REVIEWS = 3;

export function scoreConfidence(reviewCount: number): ScoreConfidence {
  const count = Number.isFinite(reviewCount) ? Math.max(0, Math.floor(reviewCount)) : 0;
  if (count <= 0) {
    return {
      level: "thin",
      label: "No reviews yet",
      caption: "A score appears once the first review is posted.",
    };
  }
  if (count === 1) {
    return {
      level: "thin",
      label: "1 review · thin sample",
      caption: "One review can sit well above or below how the team really feels.",
    };
  }
  if (count < ATTENTION_MIN_REVIEWS) {
    return {
      level: "thin",
      label: `${count} reviews · thin sample`,
      caption: "A few more reviews would make this score more reliable.",
    };
  }
  if (count < 10) {
    return {
      level: "building",
      label: `${count} reviews · building`,
      caption: "Several people have weighed in. The picture is clearer than a single review.",
    };
  }
  return {
    level: "established",
    label: `${count} reviews · established`,
    caption: "Many reviews point the same way. Treat this score with more confidence.",
  };
}

/** Divisions (or managers) need enough reviews before a low average is treated as attention. */
export function enoughReviewsForAttention(reviewCount: number): boolean {
  return Number.isFinite(reviewCount) && reviewCount >= ATTENTION_MIN_REVIEWS;
}
