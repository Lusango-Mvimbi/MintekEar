import { TAGS } from "./tags";

const knownTags = new Set(TAGS.map((tag) => tag.id));

export type ReviewDraft = {
  managerId: string;
  rating: number;
  body: string;
  tags: string[];
  honeypot: string;
};

export type ValidReview = {
  managerId: string;
  rating: number;
  body: string;
  tags: string[];
};

export type ValidationResult =
  | { ok: true; value: ValidReview }
  | { ok: false; spam: true }
  | { ok: false; spam?: false; error: string };

function cleanBody(value: string): string {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function validateReview(draft: ReviewDraft): ValidationResult {
  if (draft.honeypot.trim()) return { ok: false, spam: true };

  if (!Number.isInteger(draft.rating) || draft.rating < 1 || draft.rating > 5) {
    return { ok: false, error: "Choose a score from 1 to 5." };
  }

  const tags = [...new Set(draft.tags)];
  if (tags.length > 6) return { ok: false, error: "Choose up to 6 traits." };
  if (tags.some((tag) => !knownTags.has(tag))) {
    return { ok: false, error: "Use only the traits listed on the form." };
  }

  const body = cleanBody(draft.body);
  if (body.length < 20) {
    return { ok: false, error: "Write at least 20 characters about what you saw." };
  }
  if (body.length > 1500) {
    return { ok: false, error: "Keep the review under 1500 characters." };
  }

  const managerId = draft.managerId.trim();
  if (!managerId) return { ok: false, error: "Search for a manager in your division." };
  return { ok: true, value: { managerId, rating: draft.rating, body, tags } };
}
