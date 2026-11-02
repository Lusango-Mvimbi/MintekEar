import type { DatabaseSync } from "node:sqlite";

/** Preview administrator. Internal id stays stable for existing demo databases. */
export const DEMO_ADMIN_ID = "hr-admin";
export const DEMO_ADMIN_NAME = "Administrator (HR)";

/** Preview colleague. Not a separate HR role — grants are optional and start off. */
export const DEMO_COLLEAGUE_ID = "hr-general";
export const DEMO_COLLEAGUE_NAME = "Colleague (example)";

/** Retired demo user type. Removed so it is not a third kind of person. */
const RETIRED_ANALYST_ID = "hr-analyst";

/**
 * Demo access list: one administrator and one colleague.
 * People who work in Human Resources and are not administrators are colleagues.
 * An administrator grants extra access; that grant is not its own user type.
 */
export function alignHrAccess(db: DatabaseSync) {
  const countRow = db.prepare("SELECT COUNT(*) AS count FROM hr_access").get() as
    | { count: number | bigint }
    | undefined;
  const n = Number(countRow?.count ?? 0);

  if (n === 0) {
    const insert = db.prepare(
      `INSERT INTO hr_access
        (staff_id, display_name, can_read_comments, can_view_analysis, can_download_report, is_admin)
       VALUES (?, ?, ?, ?, ?, ?)`,
    );
    insert.run(DEMO_ADMIN_ID, DEMO_ADMIN_NAME, 1, 1, 1, 1);
    insert.run(DEMO_COLLEAGUE_ID, DEMO_COLLEAGUE_NAME, 0, 0, 0, 0);
    return;
  }

  const stale = db
    .prepare(
      `SELECT 1 AS found FROM hr_access
       WHERE staff_id = ?
          OR (staff_id = ? AND display_name != ?)
          OR (staff_id = ? AND display_name != ?)
       LIMIT 1`,
    )
    .get(RETIRED_ANALYST_ID, DEMO_ADMIN_ID, DEMO_ADMIN_NAME, DEMO_COLLEAGUE_ID, DEMO_COLLEAGUE_NAME);
  if (!stale) return;

  db.prepare(`UPDATE hr_access SET display_name = ? WHERE staff_id = ?`).run(DEMO_ADMIN_NAME, DEMO_ADMIN_ID);
  db.prepare(`UPDATE hr_access SET display_name = ? WHERE staff_id = ?`).run(
    DEMO_COLLEAGUE_NAME,
    DEMO_COLLEAGUE_ID,
  );
  db.prepare(`DELETE FROM hr_access WHERE staff_id = ?`).run(RETIRED_ANALYST_ID);
}
