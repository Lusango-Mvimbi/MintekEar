import { getDb } from "./db";
import {
  alignHrAccess,
  DEMO_ADMIN_ID,
  DEMO_ADMIN_NAME,
  DEMO_COLLEAGUE_ID,
  DEMO_COLLEAGUE_NAME,
  DEMO_HR_COLLEAGUE_ID,
  DEMO_HR_COLLEAGUE_NAME,
} from "./hr-seed";

export type HrStaff = {
  staffId: string;
  displayName: string;
  canReadComments: boolean;
  canViewAnalysis: boolean;
  canDownloadReport: boolean;
  isAdmin: boolean;
};

export type AccessGrants = {
  canReadComments: boolean;
  canViewAnalysis: boolean;
  canDownloadReport: boolean;
  isAdmin: boolean;
};

const noAccess: AccessGrants = {
  canReadComments: false,
  canViewAnalysis: false,
  canDownloadReport: false,
  isAdmin: false,
};

function flag(value: unknown): boolean {
  return value === 1 || value === true;
}

function text(value: unknown): string {
  if (typeof value === "string") return value;
  throw new Error("Expected text from the database.");
}

/** Demo people until the employee directory is connected. Names are examples only. */
export const DEMO_HR_STAFF: readonly Omit<HrStaff, "canReadComments" | "canViewAnalysis" | "canDownloadReport">[] = [
  { staffId: DEMO_ADMIN_ID, displayName: DEMO_ADMIN_NAME, isAdmin: true },
  { staffId: DEMO_COLLEAGUE_ID, displayName: DEMO_COLLEAGUE_NAME, isAdmin: false },
  { staffId: DEMO_HR_COLLEAGUE_ID, displayName: DEMO_HR_COLLEAGUE_NAME, isAdmin: false },
];

type HrAccessRow = {
  staff_id: unknown;
  display_name: unknown;
  can_read_comments: unknown;
  can_view_analysis: unknown;
  can_download_report: unknown;
  is_admin: unknown;
};

/** An administrator always has every privilege, even if a flag in the row is stale. */
function toStaff(row: HrAccessRow): HrStaff {
  const isAdmin = flag(row.is_admin);
  return {
    staffId: text(row.staff_id),
    displayName: text(row.display_name),
    canReadComments: isAdmin || flag(row.can_read_comments),
    canViewAnalysis: isAdmin || flag(row.can_view_analysis),
    canDownloadReport: isAdmin || flag(row.can_download_report),
    isAdmin,
  };
}

export function ensureHrAccessSeeded() {
  alignHrAccess(getDb());
}

export function listHrStaff(): HrStaff[] {
  ensureHrAccessSeeded();
  return getDb()
    .prepare(
      `SELECT staff_id, display_name, can_read_comments, can_view_analysis, can_download_report, is_admin
       FROM hr_access
       ORDER BY is_admin DESC, display_name COLLATE NOCASE`,
    )
    .all()
    .map((row) => toStaff(row as HrAccessRow));
}

export function getHrStaff(staffId: string): HrStaff | null {
  ensureHrAccessSeeded();
  const row = getDb()
    .prepare(
      `SELECT staff_id, display_name, can_read_comments, can_view_analysis, can_download_report, is_admin
       FROM hr_access WHERE staff_id = ?`,
    )
    .get(staffId);
  if (!row) return null;
  return toStaff(row as HrAccessRow);
}

export function grantsForStaff(staffId: string | null | undefined): AccessGrants {
  if (!staffId) return noAccess;
  const staff = getHrStaff(staffId);
  if (!staff) return noAccess;
  return {
    canReadComments: staff.canReadComments,
    canViewAnalysis: staff.canViewAnalysis,
    canDownloadReport: staff.canDownloadReport,
    isAdmin: staff.isAdmin,
  };
}

export function updateHrAccess(
  staffId: string,
  grants: { canReadComments: boolean; canViewAnalysis: boolean; canDownloadReport: boolean },
): { ok: true } | { ok: false; error: string } {
  ensureHrAccessSeeded();
  const existing = getHrStaff(staffId);
  if (!existing) return { ok: false, error: "That person is not on the list." };
  if (existing.isAdmin) {
    // Admin always keeps full access so the system cannot lock itself out.
    getDb()
      .prepare(
        `UPDATE hr_access
         SET can_read_comments = 1, can_view_analysis = 1, can_download_report = 1
         WHERE staff_id = ?`,
      )
      .run(staffId);
    return { ok: true };
  }
  getDb()
    .prepare(
      `UPDATE hr_access
       SET can_read_comments = ?, can_view_analysis = ?, can_download_report = ?
       WHERE staff_id = ?`,
    )
    .run(
      grants.canReadComments ? 1 : 0,
      grants.canViewAnalysis ? 1 : 0,
      grants.canDownloadReport ? 1 : 0,
      staffId,
    );
  return { ok: true };
}

export type HrRole = "administrator" | "colleague";

/**
 * Promote a colleague to Administrator (HR), or return an administrator to a colleague.
 * Promotion turns on every privilege. Revoking clears those privileges.
 * The last administrator cannot be removed, so Access cannot be locked.
 */
export function setHrRole(staffId: string, role: HrRole): { ok: true } | { ok: false; error: string } {
  ensureHrAccessSeeded();
  const existing = getHrStaff(staffId);
  if (!existing) return { ok: false, error: "missing" };

  const db = getDb();
  if (role === "administrator") {
    db.prepare(
      `UPDATE hr_access
       SET is_admin = 1, can_read_comments = 1, can_view_analysis = 1, can_download_report = 1
       WHERE staff_id = ?`,
    ).run(staffId);
    return { ok: true };
  }

  if (!existing.isAdmin) return { ok: true };

  db.exec("BEGIN IMMEDIATE");
  try {
    const row = db.prepare(`SELECT COUNT(*) AS count FROM hr_access WHERE is_admin = 1`).get() as
      | { count: number | bigint }
      | undefined;
    if (Number(row?.count ?? 0) <= 1) {
      db.exec("ROLLBACK");
      return { ok: false, error: "last" };
    }
    db.prepare(
      `UPDATE hr_access
       SET is_admin = 0, can_read_comments = 0, can_view_analysis = 0, can_download_report = 0
       WHERE staff_id = ?`,
    ).run(staffId);
    db.exec("COMMIT");
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {
      // The transaction was already closed.
    }
    throw error;
  }
  return { ok: true };
}
