import { getDb } from "./db";
import { DIVISIONS } from "./divisions";
import { reviewDate } from "./format";
import { sortTagIds, tagById } from "./tags";
import type { ValidReview } from "./validation";

export type ReviewAccess = {
  divisionId: string;
  hr: boolean;
};

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
  divisionId: string;
  sample: boolean;
  average: number;
  reviewCount: number;
  latest: ReviewItem;
};

export type ManagerDetail = {
  id: string;
  name: string;
  title: string;
  divisionId: string;
  sample: boolean;
  average: number;
  reviewCount: number;
  tagCounts: { id: string; count: number }[];
  reviews: ReviewItem[];
};

export type DivisionReport = {
  divisionId: string;
  name: string;
  managerCount: number;
  reviewCount: number;
  average: number | null;
  tagCounts: { id: string; count: number }[];
  managers: ManagerSummary[];
};

export type OrganisationReport = {
  reviewCount: number;
  average: number | null;
  divisions: DivisionReport[];
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

export function reviewTableColumns(): string[] {
  return getDb()
    .prepare("PRAGMA table_info(reviews)")
    .all()
    .map((row) => text(row.name));
}

export function listManagerOptions(divisionId: string): ManagerOption[] {
  const rows = getDb()
    .prepare("SELECT id, name, title FROM managers WHERE division = ? ORDER BY name COLLATE NOCASE")
    .all(divisionId);
  return rows.map((row) => ({
    id: text(row.id),
    name: text(row.name),
    title: text(row.title),
  }));
}

function listManagers(divisionId: string | null, query: string): ManagerSummary[] {
  const pattern = likePattern(query);
  const needle = query.trim().toLowerCase();
  const rows = getDb()
    .prepare(
      `SELECT * FROM (
         SELECT
           m.id,
           m.name,
           m.title,
           m.division,
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
         WHERE (? IS NULL OR m.division = ?)
       )
       WHERE review_count > 0
         AND (
           ? = ''
           OR lower(name) LIKE ? ESCAPE '\\'
           OR lower(title) LIKE ? ESCAPE '\\'
         )
       ORDER BY latest_at DESC, name COLLATE NOCASE`,
    )
    .all(divisionId, divisionId, needle, pattern, pattern);

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
      divisionId: text(row.division),
      sample: num(row.sample) === 1,
      average: num(row.average),
      reviewCount: num(row.review_count),
      latest: { ...latest, tags: tags.get(latestId) ?? [] },
    };
  });
}

export function listFeed(divisionId: string, query = ""): ManagerSummary[] {
  return listManagers(divisionId, query);
}

export function listOrganisation(): ManagerSummary[] {
  return listManagers(null, "");
}

export function getManager(id: string, access: ReviewAccess): ManagerDetail | null {
  const row = getDb()
    .prepare(
      `SELECT
         m.id,
         m.name,
         m.title,
         m.division,
         m.sample,
         (SELECT AVG(rating) FROM reviews r WHERE r.manager_id = m.id) AS average,
         (SELECT COUNT(*) FROM reviews r WHERE r.manager_id = m.id) AS review_count
       FROM managers m
       WHERE m.id = ?`,
    )
    .get(id);
  if (!row) return null;
  const divisionId = text(row.division);
  if (!access.hr && divisionId !== access.divisionId) return null;

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
    divisionId,
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

export function organisationReport(): OrganisationReport {
  const managers = listOrganisation();
  const grouped = new Map<string, ManagerSummary[]>();
  for (const manager of managers) {
    const list = grouped.get(manager.divisionId) ?? [];
    list.push(manager);
    grouped.set(manager.divisionId, list);
  }

  const tagRows = getDb()
    .prepare(
      `SELECT m.division AS division, t.tag AS tag, COUNT(*) AS count
       FROM review_tags t
       JOIN reviews r ON r.id = t.review_id
       JOIN managers m ON m.id = r.manager_id
       GROUP BY m.division, t.tag`,
    )
    .all();
  const tagsByDivision = new Map<string, { id: string; count: number }[]>();
  for (const row of tagRows) {
    const division = text(row.division);
    const list = tagsByDivision.get(division) ?? [];
    list.push({ id: text(row.tag), count: num(row.count) });
    tagsByDivision.set(division, list);
  }

  const divisions = DIVISIONS.map((division) => {
    const group = grouped.get(division.id) ?? [];
    const reviewCount = group.reduce((sum, manager) => sum + manager.reviewCount, 0);
    const weighted = group.reduce((sum, manager) => sum + manager.average * manager.reviewCount, 0);
    const tagCounts = (tagsByDivision.get(division.id) ?? [])
      .filter((tag) => tagById(tag.id))
      .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id));
    return {
      divisionId: division.id,
      name: division.name,
      managerCount: group.length,
      reviewCount,
      average: reviewCount ? weighted / reviewCount : null,
      tagCounts,
      managers: group,
    };
  });

  const reviewCount = divisions.reduce((sum, division) => sum + division.reviewCount, 0);
  const weighted = divisions.reduce(
    (sum, division) => sum + (division.average ?? 0) * division.reviewCount,
    0,
  );
  return {
    reviewCount,
    average: reviewCount ? weighted / reviewCount : null,
    divisions,
  };
}

export function insertReview(review: ValidReview, divisionId: string): InsertResult {
  const db = getDb();
  const today = reviewDate();
  let managerId = "";
  let createManager: { name: string; title: string } | null = null;

  if (review.mode === "existing") {
    const existing = db
      .prepare("SELECT id FROM managers WHERE id = ? AND division = ?")
      .get(review.managerId, divisionId);
    if (!existing) return { ok: false, error: "Choose a manager from the list, or add them." };
    managerId = review.managerId;
  } else {
    const existing = db
      .prepare("SELECT id FROM managers WHERE lower(name) = lower(?) AND division = ?")
      .get(review.managerName, divisionId);
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
        "INSERT INTO managers (id, name, title, division, sample, created_at) VALUES (?, ?, ?, ?, 0, ?)",
      ).run(managerId, createManager.name, createManager.title, divisionId, today);
    }
    db.prepare(
      "INSERT INTO reviews (id, manager_id, rating, body, created_at) VALUES (?, ?, ?, ?, ?)",
    ).run(reviewId, managerId, review.rating, review.body, today);
    const insertTag = db.prepare("INSERT INTO review_tags (review_id, tag) VALUES (?, ?)");
    for (const tag of review.tags) insertTag.run(reviewId, tag);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return { ok: true, managerId };
}
