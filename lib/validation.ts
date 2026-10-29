import { TAGS } from "./tags";

const knownTags = new Set(TAGS.map((tag) => tag.id));

export type ReviewDraft = {
  mode: string;
  managerId: string;
  managerName: string;
  managerTitle: string;
  rating: number;
  body: string;
  tags: string[];
  honeypot: string;
};

export type ValidReview =
  | {
      mode: "existing";
      managerId: string;
      rating: number;
      body: string;
      tags: string[];
    }
  | {
      mode: "new";
      managerName: string;
      managerTitle: string;
      rating: number;
      body: string;
      tags: string[];
    };

export type ValidationResult =
  | { ok: true; value: ValidReview }
  | { ok: false; spam: true }
  | { ok: false; spam?: false; error: string };

function cleanLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function cleanBody(value: string): string {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function hasLetter(value: string): boolean {
  return /\p{L}/u.test(value);
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

  if (draft.mode === "existing") {
    const managerId = draft.managerId.trim();
    if (!managerId) return { ok: false, error: "Choose a manager, or add one." };
    return { ok: true, value: { mode: "existing", managerId, rating: draft.rating, body, tags } };
  }

  if (draft.mode === "new") {
    const managerName = cleanLine(draft.managerName);
    const managerTitle = cleanLine(draft.managerTitle);
    if (managerName.length < 2 || managerName.length > 80 || !hasLetter(managerName)) {
      return { ok: false, error: "Enter the manager's name." };
    }
    if (managerTitle.length < 2 || managerTitle.length > 80 || !hasLetter(managerTitle)) {
      return { ok: false, error: "Enter the manager's role." };
    }
    return {
      ok: true,
      value: { mode: "new", managerName, managerTitle, rating: draft.rating, body, tags },
    };
  }

  return { ok: false, error: "Choose a manager, or add one." };
}
