import { getDb } from "./db";

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

/** Demo HR people until the employee directory is connected. Names are examples only. */
export const DEMO_HR_STAFF: readonly Omit<HrStaff, "canReadComments" | "canViewAnalysis" | "canDownloadReport">[] = [
  { staffId: "hr-admin", displayName: "System administrator", isAdmin: true },
  { staffId: "hr-analyst", displayName: "HR analyst (example)", isAdmin: false },
  { staffId: "hr-general", displayName: "HR colleague (example)", isAdmin: false },
];

export function ensureHrAccessSeeded() {
  const db = getDb();
  const count = db.prepare("SELECT COUNT(*) AS count FROM hr_access").get();
  const n = typeof count?.count === "number" ? count.count : Number(count?.count ?? 0);
  if (n > 0) return;

  const insert = db.prepare(
    `INSERT INTO hr_access
      (staff_id, display_name, can_read_comments, can_view_analysis, can_download_report, is_admin)
     VALUES (?, ?, ?, ?, ?, ?)`,
  );
  insert.run("hr-admin", "System administrator", 1, 1, 1, 1);
  insert.run("hr-analyst", "HR analyst (example)", 1, 1, 1, 0);
  insert.run("hr-general", "HR colleague (example)", 0, 0, 0, 0);
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
    .map((row) => ({
      staffId: text(row.staff_id),
      displayName: text(row.display_name),
      canReadComments: flag(row.can_read_comments),
      canViewAnalysis: flag(row.can_view_analysis),
      canDownloadReport: flag(row.can_download_report),
      isAdmin: flag(row.is_admin),
    }));
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
  return {
    staffId: text(row.staff_id),
    displayName: text(row.display_name),
    canReadComments: flag(row.can_read_comments),
    canViewAnalysis: flag(row.can_view_analysis),
    canDownloadReport: flag(row.can_download_report),
    isAdmin: flag(row.is_admin),
  };
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
  if (!existing) return { ok: false, error: "That HR person is not on the list." };
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
