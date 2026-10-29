import { getDb } from "./db";
import { sortTagIds } from "./tags";
import type { ValidReview } from "./validation";

export type ManagerOption = {
  id: string;
  name: string;
  title: string;
};

export type ReviewItem = {
  id: string;
  rating: number;
  body: string;
  createdAt: string;
  tags: string[];
};

export type ManagerSummary = {
  id: string;
  name: string;
  title: string;
  sample: boolean;
  average: number;
  reviewCount: number;
  latest: ReviewItem;
};

export type ManagerDetail = {
  id: string;
  name: string;
  title: string;
  sample: boolean;
  average: number;
  reviewCount: number;
  tagCounts: { id: string; count: number }[];
  reviews: ReviewItem[];
};

export type InsertResult = { ok: true; managerId: string } | { ok: false; error: string };

function text(value: unknown): string {
  if (typeof value === "string") return value;
  throw new Error("Expected text from the database.");
}

function num(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  throw new Error("Expected a number from the database.");
}

function likePattern(query: string): string {
  const escaped = query.trim().toLowerCase().replace(/[\\%_]/g, (char) => `\\${char}`);
  return `%${escaped}%`;
}

function tagsFor(reviewIds: string[]): Map<string, string[]> {
  const grouped = new Map<string, string[]>();
  if (reviewIds.length === 0) return grouped;
  const placeholders = reviewIds.map(() => "?").join(", ");
  const rows = getDb()
    .prepare(`SELECT review_id, tag FROM review_tags WHERE review_id IN (${placeholders})`)
    .all(...reviewIds);
  for (const row of rows) {
    const id = text(row.review_id);
    const tags = grouped.get(id) ?? [];
    tags.push(text(row.tag));
    grouped.set(id, tags);
  }
  for (const [id, tags] of grouped) grouped.set(id, sortTagIds(tags));
  return grouped;
}

export function listManagerOptions(): ManagerOption[] {
  const rows = getDb()
    .prepare("SELECT id, name, title FROM managers ORDER BY name COLLATE NOCASE")
    .all();
  return rows.map((row) => ({
    id: text(row.id),
    name: text(row.name),
    title: text(row.title),
  }));
}

export function listFeed(query = ""): ManagerSummary[] {
  const pattern = likePattern(query);
  const needle = query.trim().toLowerCase();
  const rows = getDb()
    .prepare(
      `SELECT * FROM (
         SELECT
           m.id,
           m.name,
           m.title,
           m.sample,
           (SELECT AVG(rating) FROM reviews r WHERE r.manager_id = m.id) AS average,
           (SELECT COUNT(*) FROM reviews r WHERE r.manager_id = m.id) AS review_count,
           (SELECT MAX(created_at) FROM reviews r WHERE r.manager_id = m.id) AS latest_at,
           (
             SELECT id FROM reviews r
             WHERE r.manager_id = m.id
             ORDER BY created_at DESC, id DESC
             LIMIT 1
           ) AS latest_id
         FROM managers m
       )
       WHERE review_count > 0
         AND (
           ? = ''
           OR lower(name) LIKE ? ESCAPE '\\'
           OR lower(title) LIKE ? ESCAPE '\\'
         )
       ORDER BY latest_at DESC, name COLLATE NOCASE`,
    )
    .all(needle, pattern, pattern);

  const latestIds = rows.map((row) => text(row.latest_id));
  const reviewRows = latestIds.length
    ? getDb()
        .prepare(
          `SELECT id, rating, body, created_at FROM reviews WHERE id IN (${latestIds.map(() => "?").join(", ")})`,
        )
        .all(...latestIds)
    : [];
  const reviews = new Map(
    reviewRows.map((row) => [
      text(row.id),
      {
        id: text(row.id),
        rating: num(row.rating),
        body: text(row.body),
        createdAt: text(row.created_at),
      },
    ]),
  );
  const tags = tagsFor(latestIds);

  return rows.map((row) => {
    const latestId = text(row.latest_id);
    const latest = reviews.get(latestId);
    if (!latest) throw new Error("Latest review is missing.");
    return {
      id: text(row.id),
      name: text(row.name),
      title: text(row.title),
      sample: num(row.sample) === 1,
      average: num(row.average),
      reviewCount: num(row.review_count),
      latest: { ...latest, tags: tags.get(latestId) ?? [] },
    };
  });
}

export function getManager(id: string): ManagerDetail | null {
  const row = getDb()
    .prepare(
      `SELECT
         m.id,
         m.name,
         m.title,
         m.sample,
         (SELECT AVG(rating) FROM reviews r WHERE r.manager_id = m.id) AS average,
         (SELECT COUNT(*) FROM reviews r WHERE r.manager_id = m.id) AS review_count
       FROM managers m
       WHERE m.id = ?`,
    )
    .get(id);
  if (!row) return null;

  const reviewRows = getDb()
    .prepare(
      `SELECT id, rating, body, created_at
       FROM reviews
       WHERE manager_id = ?
       ORDER BY created_at DESC, id DESC`,
    )
    .all(id);
  const reviewIds = reviewRows.map((review) => text(review.id));
  const tags = tagsFor(reviewIds);
  const reviews = reviewRows.map((review) => {
    const reviewId = text(review.id);
    return {
      id: reviewId,
      rating: num(review.rating),
      body: text(review.body),
      createdAt: text(review.created_at),
      tags: tags.get(reviewId) ?? [],
    };
  });

  const counts = new Map<string, number>();
  for (const review of reviews) {
    for (const tag of review.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }

  return {
    id: text(row.id),
    name: text(row.name),
    title: text(row.title),
    sample: num(row.sample) === 1,
    average: reviews.length ? num(row.average) : 0,
    reviewCount: num(row.review_count),
    tagCounts: sortTagIds([...counts.keys()]).map((tagId) => ({
      id: tagId,
      count: counts.get(tagId) ?? 0,
    })),
    reviews,
  };
}

export function insertReview(review: ValidReview): InsertResult {
  const db = getDb();
  const now = new Date().toISOString();
  let managerId = "";
  let createManager: { name: string; title: string } | null = null;

  if (review.mode === "existing") {
    const existing = db.prepare("SELECT id FROM managers WHERE id = ?").get(review.managerId);
    if (!existing) return { ok: false, error: "Choose a manager from the list, or add them." };
    managerId = review.managerId;
  } else {
    const existing = db.prepare("SELECT id FROM managers WHERE lower(name) = lower(?)").get(review.managerName);
    if (existing) {
      managerId = text(existing.id);
    } else {
      managerId = crypto.randomUUID();
      createManager = { name: review.managerName, title: review.managerTitle };
    }
  }

  const duplicate = db
    .prepare("SELECT id FROM reviews WHERE manager_id = ? AND body = ?")
    .get(managerId, review.body);
  if (duplicate) return { ok: false, error: "That same review is already on this manager." };

  const reviewId = crypto.randomUUID();
  db.exec("BEGIN IMMEDIATE");
  try {
    if (createManager) {
      db.prepare(
        "INSERT INTO managers (id, name, title, sample, created_at) VALUES (?, ?, ?, 0, ?)",
      ).run(managerId, createManager.name, createManager.title, now);
    }
    db.prepare(
      "INSERT INTO reviews (id, manager_id, rating, body, created_at) VALUES (?, ?, ?, ?, ?)",
    ).run(reviewId, managerId, review.rating, review.body, now);
    const insertTag = db.prepare("INSERT INTO review_tags (review_id, tag) VALUES (?, ?)");
    for (const tag of review.tags) insertTag.run(reviewId, tag);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return { ok: true, managerId };
}
