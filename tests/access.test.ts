import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, test } from "node:test";

function tempDb(): string {
  return path.join(os.tmpdir(), `mintekear-access-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}.db`);
}

describe("hr access", { concurrency: 1 }, () => {
  test("admin can grant comment and analysis access to selected HR only", async () => {
    const file = tempDb();
    process.env.MINTEKEAR_DB = file;
    process.env.MINTEKEAR_SKIP_SEED = "1";
    const db = await import("../lib/db");
    db.resetDbForTests();
    const access = await import("../lib/access");
    try {
      const staff = access.listHrStaff();
      assert.ok(staff.some((person) => person.isAdmin));
      const general = staff.find((person) => person.staffId === "hr-general");
      assert.ok(general);
      assert.equal(general.canReadComments, false);
      assert.equal(general.canViewAnalysis, false);
      assert.equal(general.canDownloadReport, false);

      const updated = access.updateHrAccess("hr-general", {
        canReadComments: true,
        canViewAnalysis: false,
        canDownloadReport: false,
      });
      assert.equal(updated.ok, true);
      const after = access.getHrStaff("hr-general");
      assert.equal(after?.canReadComments, true);
      assert.equal(after?.canViewAnalysis, false);

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
});
