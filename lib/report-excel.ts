import { createRequire } from "node:module";
import type { Workbook, Worksheet } from "exceljs";
import { renderAnalysisCharts } from "./analysis-chart-images";
import { company } from "./company";
import { divisionName, parseDivisionParam } from "./divisions";
import { reviewDate, roundScore } from "./format";
import { listReviewsForExport, organisationReport, type OrganisationReport, type ReviewExportRow } from "./queries";
import { tagById } from "./tags";

export type ExcelExportAccess = {
  canDownloadReport: boolean;
  canReadComments: boolean;
  isAdmin: boolean;
};

export const EXCEL_EXPORT_DENIED =
  "Excel reports that include comments need both download and comment access.";

/** Full Excel includes comment text, so download and comment access are both required. Administrators always qualify. */
export function canDownloadExcelReport(viewer: ExcelExportAccess): boolean {
  if (viewer.isAdmin) return true;
  return viewer.canDownloadReport && viewer.canReadComments;
}

export function excelReportFilename(scopeDivisionId: string | null, day: string): string {
  const scope = (scopeDivisionId ?? "all-departments").replace(/[^a-z0-9-]/gi, "") || "all-departments";
  const safeDay = /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : "report";
  return `mintekear-analysis-${scope}-${safeDay}.xlsx`;
}

export type ExcelExportResult =
  | {
      ok: true;
      status: 200;
      filename: string;
      body: Buffer;
      scopeDivisionId: string | null;
    }
  | { ok: false; status: 403; message: string };

const require = createRequire(import.meta.url);

const HEADER = "FF194D5C";
const HEADER_FONT = "FFFFFFFF";
const STRIPE = "FFF3F6F7";
const INK = "FF00131D";

function departmentLabel(scopeDivisionId: string | null): string {
  return scopeDivisionId ? divisionName(scopeDivisionId) : "All departments";
}

function traitList(tags: { id: string; count: number }[]): string {
  return tags
    .map((tag) => {
      const label = tagById(tag.id)?.label;
      return label ? `${label} (${tag.count})` : null;
    })
    .filter((label): label is string => Boolean(label))
    .join(", ");
}

function countedTraits(labels: string[]): string {
  const counts = new Map<string, number>();
  for (const label of labels) counts.set(label, (counts.get(label) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([label, count]) => `${label} (${count})`)
    .join(", ");
}

type SheetCell = string | number;

function paintSheet(sheet: Worksheet) {
  const header = sheet.getRow(1);
  header.height = 22;
  header.font = { bold: true, color: { argb: HEADER_FONT }, size: 11 };
  header.alignment = { vertical: "middle", wrapText: true };
  header.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER } };
    cell.font = { bold: true, color: { argb: HEADER_FONT }, size: 11 };
  });

  sheet.eachRow((row, index) => {
    if (index === 1) return;
    row.alignment = { vertical: "top", wrapText: true };
    row.font = { color: { argb: INK }, size: 11 };
    if (index % 2 === 0) {
      row.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: STRIPE } };
      });
    }
  });

  if (sheet.columnCount > 0) {
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: Math.max(sheet.rowCount, 1), column: sheet.columnCount },
    };
    sheet.views = [{ state: "frozen", ySplit: 1 }];
  }
  sheet.pageSetup = {
    orientation: sheet.columnCount > 4 ? "landscape" : "portrait",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    paperSize: 9,
  };
}

async function buildAnalysisWorkbook(scopeDivisionId: string | null, exportedOn: string): Promise<Buffer> {
  const { Workbook } = require("exceljs") as typeof import("exceljs");
  const report = organisationReport(scopeDivisionId);
  const reviews = listReviewsForExport(scopeDivisionId);
  const hiddenCount = reviews.filter((review) => review.hidden).length;
  const scopeName = departmentLabel(report.scopeDivisionId);

  const workbook = new Workbook();
  workbook.creator = company.appName;
  workbook.lastModifiedBy = company.appName;
  workbook.created = new Date(`${exportedOn}T00:00:00.000Z`);
  workbook.subject = "Manager analysis";

  const summary = workbook.addWorksheet("Summary");
  summary.columns = [
    { header: "Item", key: "item", width: 28 },
    { header: "Value", key: "value", width: 78 },
  ];
  const summaryRows: { item: string; value: SheetCell }[] = [
    { item: "Organisation", value: company.name },
    { item: "Report", value: `${company.appName} analysis` },
    { item: "Department", value: scopeName },
    { item: "Exported", value: exportedOn },
    { item: "Visible reviews", value: report.reviewCount },
    { item: "Hidden reviews", value: hiddenCount },
    {
      item: "Average",
      value: report.average === null ? "—" : roundScore(report.average),
    },
    {
      item: "Needs attention",
      value: report.attention.length > 0 ? report.attention.map((division) => division.name).join(", ") : "None",
    },
    {
      item: "Graphs",
      value: "Pictures of division scores, needs attention, and trait frequency are on the Graphs sheet.",
    },
  ];
  for (const bucket of report.ratingMix) {
    summaryRows.push({ item: `Score ${bucket.rating}`, value: bucket.count });
  }
  for (const tag of report.tagCounts) {
    const label = tagById(tag.id)?.label;
    if (label) summaryRows.push({ item: `Trait: ${label}`, value: tag.count });
  }
  for (const row of summaryRows) summary.addRow(row);
  paintSheet(summary);
  addGraphSheet(workbook, report);

  const divisions = workbook.addWorksheet("Divisions");
  divisions.columns = [
    { header: "Department", key: "department", width: 36 },
    { header: "Managers", key: "managers", width: 14 },
    { header: "Reviews", key: "reviews", width: 12 },
    { header: "Average", key: "average", width: 12 },
    { header: "Traits", key: "traits", width: 56 },
  ];
  for (const division of report.divisions) {
    divisions.addRow({
      department: division.name,
      managers: division.managerCount,
      reviews: division.reviewCount,
      average: division.average === null ? "—" : roundScore(division.average),
      traits: traitList(division.tagCounts),
    });
  }
  divisions.getColumn("average").numFmt = "0.0";
  paintSheet(divisions);

  const managers = workbook.addWorksheet("Managers");
  managers.columns = [
    { header: "Manager", key: "manager", width: 28 },
    { header: "Title", key: "title", width: 32 },
    { header: "Department", key: "department", width: 32 },
    { header: "Reviews", key: "reviews", width: 12 },
    { header: "Average", key: "average", width: 12 },
    { header: "Traits", key: "traits", width: 48 },
  ];
  const visibleByManager = new Map<string, ReviewExportRow[]>();
  for (const review of reviews) {
    if (review.hidden) continue;
    const list = visibleByManager.get(review.managerId) ?? [];
    list.push(review);
    visibleByManager.set(review.managerId, list);
  }
  for (const division of report.divisions) {
    for (const manager of division.managers) {
      const related = visibleByManager.get(manager.id) ?? [];
      managers.addRow({
        manager: manager.name,
        title: manager.title,
        department: division.name,
        reviews: manager.reviewCount,
        average: manager.average === null ? "—" : roundScore(manager.average),
        traits: countedTraits(related.flatMap((review) => review.traits)),
      });
    }
  }
  managers.getColumn("average").numFmt = "0.0";
  paintSheet(managers);

  const detail = workbook.addWorksheet("Reviews");
  detail.columns = [
    { header: "Manager", key: "manager", width: 28 },
    { header: "Title", key: "title", width: 32 },
    { header: "Department", key: "department", width: 32 },
    { header: "Score", key: "score", width: 10 },
    { header: "Traits", key: "traits", width: 36 },
    { header: "Comment", key: "comment", width: 72 },
    { header: "Date", key: "date", width: 14 },
    { header: "Hidden", key: "hidden", width: 12 },
  ];
  for (const review of reviews) {
    const added = detail.addRow({
      manager: review.managerName,
      title: review.managerTitle,
      department: review.divisionName,
      score: review.rating,
      traits: review.traits.join(", "),
      comment: review.comment,
      date: review.createdAt,
      hidden: review.hidden ? "Yes" : "No",
    });
    const lines = Math.max(1, Math.ceil(review.comment.length / 80));
    added.height = Math.min(96, 16 + lines * 14);
  }
  detail.getColumn("comment").alignment = { wrapText: true, vertical: "top" };
  paintSheet(detail);

  const raw = await workbook.xlsx.writeBuffer();
  return Buffer.from(raw);
}

/** PNG snapshots of the Analysis charts, embedded with ExcelJS. Not a browser capture, and not Score mix. */
function addGraphSheet(workbook: Workbook, report: OrganisationReport) {
  const sheet = workbook.addWorksheet("Graphs");
  sheet.getColumn(1).width = 88;
  sheet.getCell("A1").value = "Pictures of the Analysis charts for this department.";
  sheet.getCell("A1").font = { bold: true, size: 14, color: { argb: "FF194D5C" } };
  sheet.getRow(1).height = 24;

  const charts = renderAnalysisCharts(report);
  let row = 2;
  for (const chart of charts) {
    sheet.getCell(row, 1).value = chart.title;
    sheet.getCell(row, 1).font = { bold: true, size: 12, color: { argb: INK } };
    sheet.getRow(row).height = 20;
    const imageId = workbook.addImage({
      buffer: chart.png as never,
      extension: "png",
    });
    const anchor = row;
    sheet.addImage(imageId, {
      tl: { col: 0, row: anchor },
      ext: { width: chart.width, height: chart.height },
      editAs: "oneCell",
    });
    const span = Math.max(1, Math.ceil((chart.height * 72) / 96 / 15));
    const points = ((chart.height * 72) / 96) / span;
    for (let offset = 0; offset < span; offset += 1) {
      sheet.getRow(anchor + 1 + offset).height = points;
    }
    row = anchor + 1 + span + 1;
  }

  sheet.pageSetup = {
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    paperSize: 9,
  };
}

export async function exportAnalysisExcel(
  viewer: ExcelExportAccess,
  divisionParam: string | string[] | undefined | null,
  exportedOn = reviewDate(),
): Promise<ExcelExportResult> {
  if (!canDownloadExcelReport(viewer)) {
    return { ok: false, status: 403, message: EXCEL_EXPORT_DENIED };
  }
  const scopeDivisionId = parseDivisionParam(divisionParam);
  const body = await buildAnalysisWorkbook(scopeDivisionId, exportedOn);
  return {
    ok: true,
    status: 200,
    filename: excelReportFilename(scopeDivisionId, exportedOn),
    body,
    scopeDivisionId,
  };
}

export function excelDownloadHref(scopeDivisionId: string | null): string {
  return scopeDivisionId ? `/report/export?division=${encodeURIComponent(scopeDivisionId)}` : "/report/export";
}
