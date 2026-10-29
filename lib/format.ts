export type ScoreTone = "good" | "mixed" | "bad";

export function roundScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 10) / 10;
}

export function formatScore(value: number): string {
  return roundScore(value).toFixed(1);
}

export function scoreTone(value: number): ScoreTone {
  const score = roundScore(value);
  if (score >= 4) return "good";
  if (score >= 2.5) return "mixed";
  return "bad";
}

export function verdictLabel(value: number): string {
  const tone = scoreTone(value);
  if (tone === "good") return "Great manager";
  if (tone === "mixed") return "Mixed";
  return "Needs attention";
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

const zone = "Africa/Johannesburg";

/** Calendar day only. A review never stores a clock time. */
export function reviewDate(now = Date.now()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function dayNumber(day: string): number {
  const [year, month, date] = day.split("-").map(Number);
  return Date.UTC(year, month - 1, date);
}

export function calendarDay(value: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : reviewDate(new Date(value).getTime());
}

export function reviewYear(value: string): number {
  return Number(calendarDay(value).slice(0, 4));
}

/** Newest year first. Within each year, keep the given order (expect newest day first). */
export function groupReviewsByYear<T extends { createdAt: string }>(
  reviews: T[],
): { year: number; reviews: T[] }[] {
  const groups = new Map<number, T[]>();
  for (const review of reviews) {
    const year = reviewYear(review.createdAt);
    const list = groups.get(year) ?? [];
    list.push(review);
    groups.set(year, list);
  }
  return [...groups.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, yearReviews]) => ({ year, reviews: yearReviews }));
}

export function timeAgo(value: string, now = Date.now()): string {
  const day = calendarDay(value);
  const diff = Math.round((dayNumber(reviewDate(now)) - dayNumber(day)) / 86_400_000);
  if (diff <= 0) return "Today";
  if (diff === 1) return "1d ago";
  if (diff < 7) return `${diff}d ago`;
  const weeks = Math.floor(diff / 7);
  if (weeks < 5) return weeks === 1 ? "1w ago" : `${weeks}w ago`;
  return new Intl.DateTimeFormat("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(dayNumber(day)));
}
