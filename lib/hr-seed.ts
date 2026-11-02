import type { DatabaseSync } from "node:sqlite";
import { HR_DIVISION_ID } from "./divisions";

/** Preview administrator. Internal id stays stable for existing demo databases. */
export const DEMO_ADMIN_ID = "hr-admin";
export const DEMO_ADMIN_NAME = "Administrator (HR)";

/** Preview colleague. Not a separate HR role — grants are optional and start off. */
export const DEMO_COLLEAGUE_ID = "hr-general";
export const DEMO_COLLEAGUE_NAME = "Colleague (example)";

/**
 * A colleague who works in Human Resources, so an administrator can promote
 * them from the Access page. Still a colleague until that happens.
 */
export const DEMO_HR_COLLEAGUE_ID = "hr-ayanda";
export const DEMO_HR_COLLEAGUE_NAME = "Ayanda September (example)";

/** Retired demo user type. Removed so it is not a third kind of person. */
const RETIRED_ANALYST_ID = "hr-analyst";

type DemoAccessRow = {
  id: string;
  name: string;
  comments: number;
  analysis: number;
  download: number;
  admin: number;
};

const DEMO_ROWS: readonly DemoAccessRow[] = [
  { id: DEMO_ADMIN_ID, name: DEMO_ADMIN_NAME, comments: 1, analysis: 1, download: 1, admin: 1 },
  { id: DEMO_COLLEAGUE_ID, name: DEMO_COLLEAGUE_NAME, comments: 0, analysis: 0, download: 0, admin: 0 },
  {
    id: DEMO_HR_COLLEAGUE_ID,
    name: DEMO_HR_COLLEAGUE_NAME,
    comments: 0,
    analysis: 0,
    download: 0,
    admin: 0,
  },
];

/** Division label for demo people on the Access list. Privileges stay separate from division. */
export function demoAccessDivision(staffId: string): string | null {
  if (staffId === DEMO_ADMIN_ID || staffId === DEMO_HR_COLLEAGUE_ID) return HR_DIVISION_ID;
  return null;
}

/**
 * Demo access list: one administrator and colleagues an administrator can promote.
 * People who work in Human Resources and are not administrators are colleagues.
 * Missing demo people are inserted. Existing grants and administrator flags are left as they are,
 * so a promotion survives the next startup. Display names are aligned, and the retired analyst row is removed.
 */
export function alignHrAccess(db: DatabaseSync) {
  const find = db.prepare(`SELECT display_name FROM hr_access WHERE staff_id = ?`);
  const insert = db.prepare(
    `INSERT INTO hr_access
      (staff_id, display_name, can_read_comments, can_view_analysis, can_download_report, is_admin)
     VALUES (?, ?, ?, ?, ?, ?)`,
  );
  const rename = db.prepare(`UPDATE hr_access SET display_name = ? WHERE staff_id = ?`);

  for (const person of DEMO_ROWS) {
    const row = find.get(person.id) as { display_name: string } | undefined;
    if (!row) {
      insert.run(person.id, person.name, person.comments, person.analysis, person.download, person.admin);
      continue;
    }
    if (row.display_name !== person.name) rename.run(person.name, person.id);
  }

  db.prepare(`DELETE FROM hr_access WHERE staff_id = ?`).run(RETIRED_ANALYST_ID);
}
