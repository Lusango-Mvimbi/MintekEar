import { getDb } from "./db";
import { reviewCycleYear, reviewDate } from "./format";

/**
 * Receipts record that a person has reviewed a manager in a cycle.
 * They are not linked to a review row — the review stays anonymous.
 */

export type ReviewReceipt = {
  staffId: string;
  managerId: string;
  cycleYear: number;
  completedOn: string;
};

export type CompletionPerson = {
  staffId: string;
  displayName: string;
  divisionId: string | null;
  /** Managers in their division they have reviewed this cycle. */
  reviewedManagerIds: string[];
  /** Managers listed in their division this cycle. */
  requiredManagerIds: string[];
  /** True when they have posted at least one required review this cycle. */
  hasPosted: boolean;
};

function text(value: unknown): string {
  if (typeof value === "string") return value;
  throw new Error("Expected text from the database.");
}

function num(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  throw new Error("Expected a number from the database.");
}

export function hasReviewReceipt(
  staffId: string,
  managerId: string,
  cycleYear: number = reviewCycleYear(),
): boolean {
  if (!staffId || !managerId) return false;
  const row = getDb()
    .prepare(
      `SELECT 1 AS ok FROM review_receipts
       WHERE staff_id = ? AND manager_id = ? AND cycle_year = ?`,
    )
    .get(staffId, managerId, cycleYear);
  return Boolean(row);
}

export function recordReviewReceipt(
  staffId: string,
  managerId: string,
  cycleYear: number = reviewCycleYear(),
  completedOn: string = reviewDate(),
): { ok: true } | { ok: false; error: string } {
  if (!staffId) return { ok: false, error: "Reviews open once the employee directory is connected." };
  if (!managerId) return { ok: false, error: "Search for a manager in your division." };
  try {
    getDb()
      .prepare(
        `INSERT INTO review_receipts (staff_id, manager_id, cycle_year, completed_on)
         VALUES (?, ?, ?, ?)`,
      )
      .run(staffId, managerId, cycleYear, completedOn);
    return { ok: true };
  } catch {
    return { ok: false, error: "You have already reviewed this manager this year." };
  }
}

export function listReviewedManagerIds(
  staffId: string,
  cycleYear: number = reviewCycleYear(),
): string[] {
  if (!staffId) return [];
  return getDb()
    .prepare(
      `SELECT manager_id FROM review_receipts
       WHERE staff_id = ? AND cycle_year = ?
       ORDER BY completed_on DESC, manager_id`,
    )
    .all(staffId, cycleYear)
    .map((row) => text(row.manager_id));
}

export type StaffDivisionRow = {
  staffId: string;
  displayName: string;
  divisionId: string | null;
};

function managerIdsForDivision(divisionId: string): string[] {
  return getDb()
    .prepare("SELECT id FROM managers WHERE division = ? ORDER BY name COLLATE NOCASE")
    .all(divisionId)
    .map((row) => text(row.id));
}

/**
 * Who has / has not posted a required review this cycle.
 * Required means at least one manager in their division.
 * The list never says which review text belongs to which person.
 */
export function listReviewCompletion(
  people: readonly StaffDivisionRow[],
  cycleYear: number = reviewCycleYear(),
): CompletionPerson[] {
  const rows = getDb()
    .prepare(
      `SELECT staff_id, manager_id FROM review_receipts WHERE cycle_year = ?`,
    )
    .all(cycleYear);
  const byStaff = new Map<string, string[]>();
  for (const row of rows) {
    const staffId = text(row.staff_id);
    const list = byStaff.get(staffId) ?? [];
    list.push(text(row.manager_id));
    byStaff.set(staffId, list);
  }

  const requiredCache = new Map<string, string[]>();

  return people.map((person) => {
    let required: string[] = [];
    if (person.divisionId) {
      required = requiredCache.get(person.divisionId) ?? managerIdsForDivision(person.divisionId);
      requiredCache.set(person.divisionId, required);
    }
    const reviewed = (byStaff.get(person.staffId) ?? []).filter((id) => required.includes(id));
    return {
      staffId: person.staffId,
      displayName: person.displayName,
      divisionId: person.divisionId,
      reviewedManagerIds: reviewed,
      requiredManagerIds: required,
      hasPosted: reviewed.length > 0,
    };
  });
}

export function receiptTableColumns(): string[] {
  return getDb()
    .prepare("PRAGMA table_info(review_receipts)")
    .all()
    .map((row) => text(row.name));
}

export function receiptCountForTests(): number {
  return num(getDb().prepare("SELECT COUNT(*) AS n FROM review_receipts").get()?.n ?? 0);
}
