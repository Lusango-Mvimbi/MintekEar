import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, test } from "node:test";

function tempDb(): string {
  return path.join(os.tmpdir(), `mintekear-access-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}.db`);
}

describe("hr access", { concurrency: 1 }, () => {
  test("admin can grant comment and analysis access to a colleague", async () => {
    const file = tempDb();
    process.env.MINTEKEAR_DB = file;
    process.env.MINTEKEAR_SKIP_SEED = "1";
    const db = await import("../lib/db");
    db.resetDbForTests();
    const access = await import("../lib/access");
    try {
      const staff = access.listHrStaff();
      assert.equal(staff.length, 2);
      assert.equal(staff.filter((person) => person.isAdmin).length, 1);
      assert.equal(access.getHrStaff("hr-analyst"), null);

      const colleague = staff.find((person) => person.staffId === "hr-general");
      assert.ok(colleague);
      assert.equal(colleague.displayName, "Colleague (example)");
      assert.equal(colleague.isAdmin, false);
      assert.equal(colleague.canReadComments, false);
      assert.equal(colleague.canViewAnalysis, false);
      assert.equal(colleague.canDownloadReport, false);

      const adminSeed = access.getHrStaff("hr-admin");
      assert.equal(adminSeed?.displayName, "Administrator (HR)");
      assert.equal(adminSeed?.isAdmin, true);

      const updated = access.updateHrAccess("hr-general", {
        canReadComments: true,
        canViewAnalysis: false,
        canDownloadReport: false,
      });
      assert.equal(updated.ok, true);
      const after = access.getHrStaff("hr-general");
      assert.equal(after?.canReadComments, true);
      assert.equal(after?.canViewAnalysis, false);
      assert.equal(after?.displayName, "Colleague (example)");

      const admin = access.updateHrAccess("hr-admin", {
        canReadComments: false,
        canViewAnalysis: false,
        canDownloadReport: false,
      });
      assert.equal(admin.ok, true);
      const adminAfter = access.getHrStaff("hr-admin");
      assert.equal(adminAfter?.canReadComments, true);
      assert.equal(adminAfter?.canViewAnalysis, true);
      assert.equal(adminAfter?.canDownloadReport, true);
    } finally {
      db.resetDbForTests();
      fs.rmSync(file, { force: true });
    }
  });

  test("retired HR analyst and HR colleague labels collapse to the two user types", async () => {
    const file = tempDb();
    process.env.MINTEKEAR_DB = file;
    process.env.MINTEKEAR_SKIP_SEED = "1";
    const dbMod = await import("../lib/db");
    dbMod.resetDbForTests();
    const access = await import("../lib/access");
    const { alignHrAccess } = await import("../lib/hr-seed");
    try {
      const database = dbMod.getDb();
      database
        .prepare(
          `INSERT INTO hr_access
            (staff_id, display_name, can_read_comments, can_view_analysis, can_download_report, is_admin)
           VALUES ('hr-analyst', 'HR analyst (example)', 1, 1, 1, 0)`,
        )
        .run();
      database.prepare(`UPDATE hr_access SET display_name = ? WHERE staff_id = ?`).run(
        "HR colleague (example)",
        "hr-general",
      );
      database.prepare(`UPDATE hr_access SET display_name = ? WHERE staff_id = ?`).run(
        "System administrator",
        "hr-admin",
      );

      alignHrAccess(database);

      assert.equal(access.getHrStaff("hr-analyst"), null);
      assert.equal(access.getHrStaff("hr-general")?.displayName, "Colleague (example)");
      assert.equal(access.getHrStaff("hr-general")?.canReadComments, false);
      assert.equal(access.getHrStaff("hr-admin")?.displayName, "Administrator (HR)");
      assert.equal(access.listHrStaff().some((person) => /analyst|HR colleague/i.test(person.displayName)), false);
    } finally {
      dbMod.resetDbForTests();
      fs.rmSync(file, { force: true });
    }
  });
});
