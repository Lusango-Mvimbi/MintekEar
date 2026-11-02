import assert from "node:assert/strict";
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, test } from "node:test";
import type { Workbook as ExcelWorkbook, Worksheet } from "exceljs";

const { Workbook } = createRequire(import.meta.url)("exceljs") as typeof import("exceljs");
import {
  EXCEL_EXPORT_DENIED,
  canDownloadExcelReport,
  excelReportFilename,
  exportAnalysisExcel,
  type ExcelExportAccess,
} from "../lib/report-excel";

const day = "2026-11-02";

const colleague: ExcelExportAccess = {
  canDownloadReport: false,
  canReadComments: false,
  isAdmin: false,
};

const downloadOnly: ExcelExportAccess = {
  canDownloadReport: true,
  canReadComments: false,
  isAdmin: false,
};

const commentsOnly: ExcelExportAccess = {
  canDownloadReport: false,
  canReadComments: true,
  isAdmin: false,
};

const both: ExcelExportAccess = {
  canDownloadReport: true,
  canReadComments: true,
  isAdmin: false,
};

const adminWithStaleFlags: ExcelExportAccess = {
  canDownloadReport: false,
  canReadComments: false,
  isAdmin: true,
};

function tempDb(): string {
  return path.join(
    os.tmpdir(),
    `mintekear-excel-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}.db`,
  );
}

async function openDb(file: string) {
  process.env.MINTEKEAR_DB = file;
  process.env.MINTEKEAR_SKIP_SEED = "1";
  const db = await import("../lib/db");
  db.resetDbForTests();
  return db;
}

function seedScopedReviews(database: ReturnType<Awaited<ReturnType<typeof openDb>>["getDb"]>) {
  const insertManager = database.prepare(
    "INSERT INTO managers (id, name, title, division, sample, created_at) VALUES (?, ?, ?, ?, 0, ?)",
  );
  insertManager.run("mgr-filter-finance", "Finance Lead", "Manager", "finance", "2026-01-01");
  insertManager.run("mgr-filter-ict", "ICT Lead", "Manager", "ict", "2026-01-01");
  const insertReview = database.prepare(
    "INSERT INTO reviews (id, manager_id, rating, body, created_at, hidden) VALUES (?, ?, ?, ?, ?, ?)",
  );
  insertReview.run(
    "rev-filter-visible",
    "mgr-filter-finance",
    2,
    "Visible finance note about plans.",
    "2026-02-01",
    0,
  );
  insertReview.run(
    "rev-filter-hidden",
    "mgr-filter-finance",
    5,
    "Hidden finance note about plans.",
    "2026-02-02",
    1,
  );
  insertReview.run("rev-filter-other", "mgr-filter-ict", 1, "ICT note that stays in ICT.", "2026-02-03", 0);
  const insertTag = database.prepare("INSERT INTO review_tags (review_id, tag) VALUES (?, ?)");
  insertTag.run("rev-filter-visible", "blames-team");
  insertTag.run("rev-filter-hidden", "supportive");
  insertTag.run("rev-filter-other", "micromanages");
}

function sheet(workbook: ExcelWorkbook, name: string): Worksheet {
  const found = workbook.getWorksheet(name);
  assert.ok(found, name);
  return found;
}

function headers(worksheet: Worksheet): string[] {
  const values: string[] = [];
  worksheet.getRow(1).eachCell((cell) => {
    values.push(String(cell.value ?? ""));
  });
  return values;
}

function column(worksheet: Worksheet, header: string): string[] {
  const names = headers(worksheet);
  const index = names.indexOf(header);
  assert.notEqual(index, -1, header);
  const values: string[] = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const cell = row.getCell(index + 1).value;
    values.push(cell == null ? "" : String(cell));
  });
  return values;
}

function summaryValue(worksheet: Worksheet, item: string): string {
  let found = "";
  let seen = false;
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    if (String(row.getCell(1).value ?? "") === item) {
      found = String(row.getCell(2).value ?? "");
      seen = true;
    }
  });
  assert.equal(seen, true, item);
  return found;
}

const forbiddenHeader = /reviewer|author|ip address|device|staff number|email|user agent|identity/i;

function assertGraphSheet(workbook: ExcelWorkbook, department: string) {
  const graphs = sheet(workbook, "Graphs");
  const images = graphs.getImages();
  assert.equal(images.length, 3, "Graphs sheet embeds three chart pictures");
  let text = "";
  graphs.eachRow((row) => {
    row.eachCell((cell) => {
      text += `${String(cell.value ?? "")}\n`;
    });
  });
  assert.match(text, /Division scores/);
  assert.match(text, /Needs attention/);
  assert.match(text, /Trait frequency/);
  assert.equal(text.includes("Score mix"), false);
  assert.equal(forbiddenHeader.test(text), false);
  assert.match(summaryValue(sheet(workbook, "Summary"), "Graphs"), /Graphs sheet/);
  assert.equal(summaryValue(sheet(workbook, "Summary"), "Department"), department);

  const media = workbook.model.media ?? [];
  assert.ok(media.length >= 3);
  for (const item of media) {
    const buffer = Buffer.isBuffer(item.buffer) ? item.buffer : Buffer.from(item.buffer);
    assert.equal(buffer.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.equal(item.extension, "png");
  }
}

describe("analysis excel export", { concurrency: 1 }, () => {
  test("excel download needs both privileges, or an administrator", () => {
    assert.equal(canDownloadExcelReport(colleague), false);
    assert.equal(canDownloadExcelReport(downloadOnly), false);
    assert.equal(canDownloadExcelReport(commentsOnly), false);
    assert.equal(canDownloadExcelReport(both), true);
    assert.equal(canDownloadExcelReport(adminWithStaleFlags), true);
    assert.equal(excelReportFilename(null, day), "mintekear-analysis-all-departments-2026-11-02.xlsx");
    assert.equal(excelReportFilename("finance", day), "mintekear-analysis-finance-2026-11-02.xlsx");
  });

  test("download without comment access is refused and does not return a workbook", async () => {
    for (const viewer of [colleague, downloadOnly, commentsOnly]) {
      const result = await exportAnalysisExcel(viewer, "finance", day);
      assert.equal(result.ok, false);
      if (result.ok) return;
      assert.equal(result.status, 403);
      assert.equal(result.message, EXCEL_EXPORT_DENIED);
      assert.equal(result.message.includes("Visible finance note"), false);
    }
  });

  test("workbook includes comments and hidden reviews, and a department export leaves other departments out", async () => {
    const file = tempDb();
    const db = await openDb(file);
    try {
      seedScopedReviews(db.getDb());

      const finance = await exportAnalysisExcel(both, "finance", day);
      assert.equal(finance.ok, true);
      if (!finance.ok) return;
      assert.equal(finance.status, 200);
      assert.equal(finance.scopeDivisionId, "finance");
      assert.equal(finance.filename, "mintekear-analysis-finance-2026-11-02.xlsx");
      assert.equal(finance.body.subarray(0, 2).toString(), "PK");

      const workbook = new Workbook();
      await workbook.xlsx.load(finance.body as never);
      assert.deepEqual(
        workbook.worksheets.map((item) => item.name),
        ["Summary", "Graphs", "Divisions", "Managers", "Reviews"],
      );

      const summary = sheet(workbook, "Summary");
      assert.equal(summaryValue(summary, "Department"), "Finance");
      assert.equal(summaryValue(summary, "Exported"), day);
      assert.equal(summaryValue(summary, "Visible reviews"), "1");
      assert.equal(summaryValue(summary, "Hidden reviews"), "1");
      let anonymityRow = false;
      summary.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        if (String(row.getCell(1).value ?? "") === "Anonymity") anonymityRow = true;
      });
      assert.equal(anonymityRow, false);

      const reviews = sheet(workbook, "Reviews");
      const reviewHeaders = headers(reviews);
      assert.deepEqual(reviewHeaders, [
        "Manager",
        "Title",
        "Department",
        "Score",
        "Traits",
        "Comment",
        "Date",
        "Hidden",
      ]);
      for (const header of reviewHeaders) assert.equal(forbiddenHeader.test(header), false);
      for (const name of ["Summary", "Divisions", "Managers"]) {
        for (const header of headers(sheet(workbook, name))) assert.equal(forbiddenHeader.test(header), false);
      }

      const comments = column(reviews, "Comment");
      assert.ok(comments.includes("Visible finance note about plans."));
      assert.ok(comments.includes("Hidden finance note about plans."));
      assert.equal(comments.includes("ICT note that stays in ICT."), false);
      assert.deepEqual(column(reviews, "Department"), ["Finance", "Finance"]);
      assert.deepEqual(column(reviews, "Hidden"), ["No", "Yes"]);
      assert.ok(column(reviews, "Traits").includes("Blames team"));
      assert.equal(column(reviews, "Score").includes("2"), true);

      const divisions = column(sheet(workbook, "Divisions"), "Department");
      assert.deepEqual(divisions, ["Finance"]);
      const managerNames = column(sheet(workbook, "Managers"), "Manager");
      assert.ok(managerNames.includes("Finance Lead"));
      assert.equal(managerNames.includes("ICT Lead"), false);
      assertGraphSheet(workbook, "Finance");

      const all = await exportAnalysisExcel(adminWithStaleFlags, "not-a-division", day);
      assert.equal(all.ok, true);
      if (!all.ok) return;
      assert.equal(all.scopeDivisionId, null);
      assert.equal(all.filename, "mintekear-analysis-all-departments-2026-11-02.xlsx");
      const allBook = new Workbook();
      await allBook.xlsx.load(all.body as never);
      const allSummary = sheet(allBook, "Summary");
      assert.equal(summaryValue(allSummary, "Department"), "All departments");
      assert.equal(summaryValue(allSummary, "Visible reviews"), "2");
      assert.equal(summaryValue(allSummary, "Hidden reviews"), "1");
      const allComments = column(sheet(allBook, "Reviews"), "Comment");
      assert.ok(allComments.includes("Visible finance note about plans."));
      assert.ok(allComments.includes("Hidden finance note about plans."));
      assert.ok(allComments.includes("ICT note that stays in ICT."));
      const allDepartments = column(sheet(allBook, "Reviews"), "Department");
      assert.ok(allDepartments.includes("Finance"));
      assert.ok(allDepartments.includes("ICT"));
      assertGraphSheet(allBook, "All departments");
    } finally {
      db.resetDbForTests();
      fs.rmSync(file, { force: true });
    }
  });
});
