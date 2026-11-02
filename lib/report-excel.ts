import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import type { Cell, Workbook, Worksheet } from "exceljs";
import { renderAnalysisCharts } from "./analysis-chart-images";
import { company } from "./company";
import { divisionName, parseDivisionParam } from "./divisions";
import { formatScore, reviewDate, roundScore, scoreTone, type ScoreTone } from "./format";
import { listReviewsForExport, organisationReport, type OrganisationReport, type ReviewExportRow } from "./queries";
import { displayTrait } from "./tags";

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

const FONT = "Calibri";
const BRAND = "FFD22D20";
const INK = "FF00131D";
const MUTED = "FF5E828D";
const ACCENT = "FF194D5C";
const PAPER = "FFF3F6F7";
const LINE = "FFE3EAEB";
const WHITE = "FFFFFFFF";
const STRIPE = "FFF7FAFB";
const GOOD = "FF0F8A4B";
const MIXED = "FFC4841D";
const BAD = "FFD64545";
const HIDDEN_BG = "FFFDECEE";

const GRAPH_COLUMNS = 13;
const TABLE_HEADER_ROW = 4;

type SheetValue = string | number | Date;

type TableColumn = {
  header: string;
  key: string;
  width: number;
  numFmt?: string;
  align?: "left" | "center";
  wrap?: boolean;
};

function departmentLabel(scopeDivisionId: string | null): string {
  return scopeDivisionId ? divisionName(scopeDivisionId) : "All departments";
}

function traitList(tags: { id: string; count: number }[]): string {
  return tags
    .map((tag) => {
      const label = displayTrait(tag.id)?.label;
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

function solid(argb: string): Cell["fill"] {
  return { type: "pattern", pattern: "solid", fgColor: { argb } };
}

function toneColor(tone: ScoreTone): string {
  if (tone === "good") return GOOD;
  if (tone === "mixed") return MIXED;
  return BAD;
}

function columnLetter(index: number): string {
  let n = index;
  let letters = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}

function longExportDate(day: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return day;
  const [year, month, date] = day.split("-").map(Number);
  return new Intl.DateTimeFormat("en-ZA", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, date)));
}

function scopeLine(scopeName: string, exportedOn: string): string {
  return `${scopeName} · Exported ${longExportDate(exportedOn)} · Africa/Johannesburg`;
}

function reviewDay(iso: string): SheetValue {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12));
}

function applyFooter(sheet: Worksheet, scopeName: string) {
  sheet.headerFooter = {
    oddFooter: `&L&8MintekEar analysis&C&8${scopeName} · Anonymous&R&8Page &P`,
  };
  sheet.pageSetup.paperSize = 9;
  sheet.pageSetup.orientation = "landscape";
  sheet.pageSetup.fitToPage = true;
  sheet.pageSetup.fitToWidth = 1;
  sheet.pageSetup.fitToHeight = 0;
  sheet.pageSetup.horizontalCentered = true;
  sheet.pageSetup.margins = { left: 0.45, right: 0.45, top: 0.55, bottom: 0.5, header: 0.25, footer: 0.25 };
}

function paintBanner(sheet: Worksheet, lastCol: number, title: string, subtitle: string) {
  sheet.mergeCells(1, 1, 1, lastCol);
  const bar = sheet.getCell(1, 1);
  bar.fill = solid(BRAND);
  sheet.getRow(1).height = 8;

  sheet.mergeCells(2, 1, 2, lastCol);
  const titleCell = sheet.getCell(2, 1);
  titleCell.value = title;
  titleCell.font = { name: FONT, size: 18, bold: true, color: { argb: INK } };
  titleCell.alignment = { vertical: "middle" };
  sheet.getRow(2).height = 28;

  sheet.mergeCells(3, 1, 3, lastCol);
  const subtitleCell = sheet.getCell(3, 1);
  subtitleCell.value = subtitle;
  subtitleCell.font = { name: FONT, size: 11, color: { argb: MUTED } };
  subtitleCell.alignment = { vertical: "middle", wrapText: true };
  sheet.getRow(3).height = 20;
}

function styleTable(sheet: Worksheet, columns: TableColumn[], rowCount: number) {
  const header = sheet.getRow(TABLE_HEADER_ROW);
  header.height = 22;
  columns.forEach((column, index) => {
    const cell = header.getCell(index + 1);
    cell.value = column.header;
    cell.font = { name: FONT, size: 11, bold: true, color: { argb: WHITE } };
    cell.fill = solid(ACCENT);
    cell.alignment = { vertical: "middle", horizontal: column.align ?? "left", wrapText: true };
    const dataColumn = sheet.getColumn(index + 1);
    dataColumn.width = column.width;
    if (column.numFmt) dataColumn.numFmt = column.numFmt;
  });

  for (let offset = 0; offset < rowCount; offset += 1) {
    const rowNumber = TABLE_HEADER_ROW + 1 + offset;
    const row = sheet.getRow(rowNumber);
    const stripe = offset % 2 === 1;
    columns.forEach((column, index) => {
      const cell = row.getCell(index + 1);
      cell.font = { name: FONT, size: 11, color: { argb: INK } };
      cell.alignment = {
        vertical: "top",
        horizontal: column.align ?? "left",
        wrapText: column.wrap ?? false,
      };
      if (stripe) cell.fill = solid(STRIPE);
      cell.border = { bottom: { style: "hair", color: { argb: LINE } } };
    });
  }

  const lastRow = Math.max(TABLE_HEADER_ROW, TABLE_HEADER_ROW + rowCount);
  const lastCol = columns.length;
  if (lastCol > 0) {
    sheet.autoFilter = {
      from: { row: TABLE_HEADER_ROW, column: 1 },
      to: { row: lastRow, column: lastCol },
    };
    sheet.pageSetup.printArea = `A1:${columnLetter(lastCol)}${lastRow}`;
    sheet.pageSetup.printTitlesRow = `${TABLE_HEADER_ROW}:${TABLE_HEADER_ROW}`;
  }
  sheet.views = [{ state: "frozen", ySplit: TABLE_HEADER_ROW, showGridLines: false }];
}

function addTable(
  workbook: Workbook,
  name: string,
  tab: string,
  title: string,
  subtitle: string,
  columns: TableColumn[],
  rows: Record<string, SheetValue>[],
  rowHeight?: (row: Record<string, SheetValue>) => number,
): Worksheet {
  const sheet = workbook.addWorksheet(name);
  sheet.properties.tabColor = { argb: tab };
  columns.forEach((column, index) => {
    sheet.getColumn(index + 1).key = column.key;
    sheet.getColumn(index + 1).width = column.width;
  });
  paintBanner(sheet, columns.length, title, subtitle);
  rows.forEach((data, index) => {
    const row = sheet.getRow(TABLE_HEADER_ROW + 1 + index);
    columns.forEach((column, colIndex) => {
      row.getCell(colIndex + 1).value = data[column.key] ?? "";
    });
    row.height = rowHeight?.(data) ?? 20;
  });
  styleTable(sheet, columns, rows.length);
  applyFooter(sheet, subtitle);
  return sheet;
}

function linesFor(text: string, width: number): number {
  const size = Math.max(16, width);
  return Math.max(1, Math.ceil(text.length / size));
}

function brandLogo(): Buffer | null {
  const file = path.join(process.cwd(), "public", "brand", "mintek-logo.png");
  if (!fs.existsSync(file)) return null;
  return fs.readFileSync(file);
}

function paintCard(
  sheet: Worksheet,
  col: number,
  top: number,
  label: string,
  value: string,
  caption: string,
  color: string,
) {
  for (let row = top; row < top + 3; row += 1) {
    for (let column = col; column < col + 2; column += 1) {
      const cell = sheet.getCell(row, column);
      cell.fill = solid(WHITE);
      cell.border = {
        top: { style: row === top ? "medium" : "thin", color: { argb: row === top ? color : LINE } },
        bottom: { style: "thin", color: { argb: row === top + 2 ? LINE : WHITE } },
        left: { style: "thin", color: { argb: column === col ? LINE : WHITE } },
        right: { style: "thin", color: { argb: column === col + 1 ? LINE : WHITE } },
      };
    }
  }
  sheet.mergeCells(top, col, top, col + 1);
  sheet.mergeCells(top + 1, col, top + 1, col + 1);
  sheet.mergeCells(top + 2, col, top + 2, col + 1);

  const labelCell = sheet.getCell(top, col);
  labelCell.value = label;
  labelCell.font = { name: FONT, size: 10, bold: true, color: { argb: MUTED } };
  labelCell.alignment = { vertical: "middle", indent: 1 };

  const valueCell = sheet.getCell(top + 1, col);
  valueCell.value = value;
  valueCell.font = { name: FONT, size: 28, bold: true, color: { argb: color } };
  valueCell.alignment = { vertical: "middle", indent: 1 };

  const captionCell = sheet.getCell(top + 2, col);
  captionCell.value = caption;
  captionCell.font = { name: FONT, size: 10, color: { argb: MUTED } };
  captionCell.alignment = { vertical: "middle", wrapText: true, indent: 1 };

  sheet.getRow(top).height = 22;
  sheet.getRow(top + 1).height = 40;
  sheet.getRow(top + 2).height = 32;
}

function addSummarySheet(
  workbook: Workbook,
  report: OrganisationReport,
  scopeName: string,
  exportedOn: string,
  hiddenCount: number,
) {
  const sheet = workbook.addWorksheet("Summary");
  sheet.properties.tabColor = { argb: ACCENT };
  const widths = [18, 18, 2.4, 18, 18, 2.4, 18, 20];
  widths.forEach((width, index) => {
    sheet.getColumn(index + 1).width = width;
  });

  for (let row = 1; row <= 22; row += 1) {
    for (let column = 1; column <= 8; column += 1) {
      sheet.getCell(row, column).fill = solid(PAPER);
    }
  }

  sheet.mergeCells("A1:H1");
  sheet.getCell("A1").fill = solid(BRAND);
  sheet.getRow(1).height = 8;

  sheet.mergeCells("B2:E2");
  const title = sheet.getCell("B2");
  title.value = company.appName;
  title.font = { name: FONT, size: 22, bold: true, color: { argb: INK } };
  title.alignment = { vertical: "middle" };
  title.fill = solid(WHITE);
  sheet.mergeCells("F2:H2");
  const reportLabel = sheet.getCell("F2");
  reportLabel.value = "Analysis report";
  reportLabel.font = { name: FONT, size: 14, bold: true, color: { argb: ACCENT } };
  reportLabel.alignment = { vertical: "middle", horizontal: "right" };
  reportLabel.fill = solid(WHITE);
  for (let column = 1; column <= 8; column += 1) sheet.getCell(2, column).fill = solid(WHITE);
  sheet.getRow(2).height = 36;

  sheet.mergeCells("A3:H3");
  const subtitle = sheet.getCell("A3");
  subtitle.value = scopeLine(scopeName, exportedOn);
  subtitle.font = { name: FONT, size: 11, color: { argb: MUTED } };
  subtitle.alignment = { vertical: "middle" };
  subtitle.fill = solid(WHITE);
  for (let column = 1; column <= 8; column += 1) sheet.getCell(3, column).fill = solid(WHITE);
  sheet.getRow(3).height = 20;
  sheet.getRow(4).height = 10;

  const section = sheet.getCell("A5");
  section.value = "Key figures";
  section.font = { name: FONT, size: 11, bold: true, color: { argb: ACCENT } };
  section.fill = solid(PAPER);
  sheet.getRow(5).height = 18;

  const average = report.average;
  const averageColor = average === null ? MUTED : toneColor(scoreTone(average));
  const attentionCount = report.attention.length;
  const attentionColor = attentionCount > 0 ? BAD : GOOD;
  paintCard(
    sheet,
    1,
    6,
    "Reviews",
    String(report.reviewCount),
    scopeName === "All departments" ? "Across Mintek" : `In ${scopeName}`,
    ACCENT,
  );
  paintCard(
    sheet,
    4,
    6,
    "Average",
    average === null ? "—" : formatScore(average),
    "Out of 5, visible only",
    averageColor,
  );
  paintCard(
    sheet,
    7,
    6,
    "Needs attention",
    String(attentionCount),
    scopeName === "All departments"
      ? "Divisions under 2.5"
      : attentionCount > 0
        ? "Average under 2.5"
        : "At or above 2.5",
    attentionColor,
  );

  sheet.getRow(9).height = 12;
  const details = sheet.getCell("A10");
  details.value = "Report details";
  details.font = { name: FONT, size: 11, bold: true, color: { argb: ACCENT } };
  details.fill = solid(PAPER);
  sheet.getRow(10).height = 18;

  const attention =
    report.attention.length > 0 ? report.attention.map((division) => division.name).join(", ") : "None";
  const facts: { item: string; value: SheetValue; numFmt?: string }[] = [
    { item: "Organisation", value: company.name },
    { item: "Department", value: scopeName },
    { item: "Exported", value: exportedOn },
    { item: "Visible reviews", value: report.reviewCount, numFmt: "#,##0" },
    { item: "Hidden reviews", value: hiddenCount, numFmt: "#,##0" },
    { item: "Average", value: average === null ? "—" : roundScore(average), numFmt: "0.0" },
    { item: "Needs attention", value: attention },
    {
      item: "Graphs",
      value: "Overview, division scores, needs attention, and trait frequency are pictured on the Graphs sheet.",
    },
  ];

  facts.forEach((fact, index) => {
    const rowNumber = 11 + index;
    sheet.mergeCells(rowNumber, 2, rowNumber, 8);
    const label = sheet.getCell(rowNumber, 1);
    label.value = fact.item;
    label.font = { name: FONT, size: 11, color: { argb: MUTED } };
    label.alignment = { vertical: "top" };
    label.fill = solid(index % 2 === 0 ? WHITE : STRIPE);
    const value = sheet.getCell(rowNumber, 2);
    value.value = fact.value;
    value.font = { name: FONT, size: 12, bold: true, color: { argb: INK } };
    value.alignment = { vertical: "top", wrapText: true };
    if (fact.numFmt && typeof fact.value === "number") value.numFmt = fact.numFmt;
    for (let column = 2; column <= 8; column += 1) {
      sheet.getCell(rowNumber, column).fill = solid(index % 2 === 0 ? WHITE : STRIPE);
    }
    const length = String(fact.value).length;
    sheet.getRow(rowNumber).height = length < 40 ? 20 : Math.max(20, Math.min(48, linesFor(String(fact.value), 90) * 16));
  });

  const noteRow = 11 + facts.length + 1;
  sheet.mergeCells(noteRow, 1, noteRow, 8);
  const note = sheet.getCell(noteRow, 1);
  note.value = "Hidden reviews are listed on Reviews and left out of averages and charts.";
  note.font = { name: FONT, size: 10, italic: true, color: { argb: MUTED } };
  note.alignment = { vertical: "middle", wrapText: true };
  note.fill = solid(PAPER);
  sheet.getRow(noteRow).height = 22;

  const logo = brandLogo();
  if (logo) {
    const imageId = workbook.addImage({ buffer: logo as never, extension: "png" });
    sheet.addImage(imageId, {
      tl: { col: 0.15, row: 1.12 },
      ext: { width: 58, height: 42 },
      editAs: "oneCell",
    });
  }

  sheet.views = [{ showGridLines: false }];
  applyFooter(sheet, scopeName);
  sheet.pageSetup.fitToHeight = 1;
  sheet.pageSetup.printArea = `A1:H${noteRow}`;
  return sheet;
}

function addGraphSheet(workbook: Workbook, report: OrganisationReport, scopeName: string, exportedOn: string) {
  const sheet = workbook.addWorksheet("Graphs");
  sheet.properties.tabColor = { argb: BRAND };
  for (let column = 1; column <= GRAPH_COLUMNS; column += 1) sheet.getColumn(column).width = 11;

  paintBanner(sheet, GRAPH_COLUMNS, `${company.appName}  ·  Graphs`, scopeLine(scopeName, exportedOn));
  sheet.mergeCells(4, 1, 4, GRAPH_COLUMNS);
  const note = sheet.getCell(4, 1);
  note.value = "Hidden reviews are excluded from these charts.";
  note.font = { name: FONT, size: 11, italic: true, color: { argb: MUTED } };
  note.alignment = { vertical: "middle" };
  sheet.getRow(4).height = 18;
  sheet.getRow(5).height = 8;

  const charts = renderAnalysisCharts(report);
  let row = 6;
  for (const chart of charts) {
    sheet.mergeCells(row, 1, row, GRAPH_COLUMNS);
    const caption = sheet.getCell(row, 1);
    caption.value = `${chart.title} · ${scopeName}`;
    caption.font = { name: FONT, size: 12, bold: true, color: { argb: INK } };
    caption.alignment = { vertical: "middle" };
    sheet.getRow(row).height = 22;

    const imageId = workbook.addImage({
      buffer: chart.png as never,
      extension: "png",
    });
    const imageRow = row + 1;
    sheet.addImage(imageId, {
      tl: { col: 0.2, row: imageRow - 1 },
      ext: { width: chart.width, height: chart.height },
      editAs: "oneCell",
    });
    const points = (chart.height * 72) / 96;
    const span = Math.max(1, Math.ceil(points / 18));
    const each = points / span;
    for (let offset = 0; offset < span; offset += 1) {
      sheet.getRow(imageRow + offset).height = each;
    }
    row = imageRow + span + 1;
  }

  const lastRow = Math.max(6, row - 2);
  sheet.views = [{ state: "frozen", ySplit: 4, showGridLines: false }];
  applyFooter(sheet, scopeName);
  sheet.pageSetup.printArea = `A1:${columnLetter(GRAPH_COLUMNS)}${lastRow}`;
  sheet.pageSetup.printTitlesRow = "1:4";
}

async function buildAnalysisWorkbook(scopeDivisionId: string | null, exportedOn: string): Promise<Buffer> {
  const { Workbook } = require("exceljs") as typeof import("exceljs");
  const report = organisationReport(scopeDivisionId);
  const reviews = listReviewsForExport(scopeDivisionId);
  const hiddenCount = reviews.filter((review) => review.hidden).length;
  const scopeName = departmentLabel(report.scopeDivisionId);
  const subtitle = scopeLine(scopeName, exportedOn);

  const workbook = new Workbook();
  workbook.creator = company.appName;
  workbook.lastModifiedBy = company.appName;
  workbook.company = company.name;
  workbook.title = `${company.appName} analysis`;
  workbook.subject = `${company.appName} analysis · ${scopeName}`;
  workbook.category = "Report";
  workbook.keywords = "MintekEar,Mintek,analysis";
  workbook.description = `${company.appName} analysis for ${scopeName}. Anonymous. No reviewer name, staff number, or device.`;
  workbook.created = new Date(`${exportedOn}T12:00:00.000Z`);

  addSummarySheet(workbook, report, scopeName, exportedOn, hiddenCount);
  addGraphSheet(workbook, report, scopeName, exportedOn);

  const divisionRows = report.divisions.map((division) => ({
    department: division.name,
    managers: division.managerCount,
    reviews: division.reviewCount,
    average: division.average === null ? "—" : roundScore(division.average),
    traits: traitList(division.tagCounts),
  }));
  addTable(
    workbook,
    "Divisions",
    INK,
    `${company.appName}  ·  Divisions`,
    subtitle,
    [
      { header: "Department", key: "department", width: 38, wrap: true },
      { header: "Managers", key: "managers", width: 14, numFmt: "#,##0", align: "center" },
      { header: "Reviews", key: "reviews", width: 12, numFmt: "#,##0", align: "center" },
      { header: "Average", key: "average", width: 12, numFmt: "0.0", align: "center" },
      { header: "Traits", key: "traits", width: 56, wrap: true },
    ],
    divisionRows,
    (row) => Math.min(64, Math.max(20, linesFor(String(row.traits ?? ""), 52) * 16)),
  );

  const visibleByManager = new Map<string, ReviewExportRow[]>();
  for (const review of reviews) {
    if (review.hidden) continue;
    const list = visibleByManager.get(review.managerId) ?? [];
    list.push(review);
    visibleByManager.set(review.managerId, list);
  }
  const managerRows: Record<string, SheetValue>[] = [];
  for (const division of report.divisions) {
    for (const manager of division.managers) {
      const related = visibleByManager.get(manager.id) ?? [];
      managerRows.push({
        manager: manager.name,
        title: manager.title,
        department: division.name,
        reviews: manager.reviewCount,
        average: manager.average === null ? "—" : roundScore(manager.average),
        traits: countedTraits(related.flatMap((review) => review.traits)),
      });
    }
  }
  addTable(
    workbook,
    "Managers",
    MUTED,
    `${company.appName}  ·  Managers`,
    subtitle,
    [
      { header: "Manager", key: "manager", width: 28, wrap: true },
      { header: "Title", key: "title", width: 32, wrap: true },
      { header: "Department", key: "department", width: 34, wrap: true },
      { header: "Reviews", key: "reviews", width: 12, numFmt: "#,##0", align: "center" },
      { header: "Average", key: "average", width: 12, numFmt: "0.0", align: "center" },
      { header: "Traits", key: "traits", width: 48, wrap: true },
    ],
    managerRows,
    (row) => Math.min(64, Math.max(20, linesFor(String(row.traits ?? ""), 44) * 16)),
  );

  const reviewRows = reviews.map((review) => ({
    manager: review.managerName,
    title: review.managerTitle,
    department: review.divisionName,
    score: review.rating,
    traits: review.traits.join(", "),
    comment: review.comment,
    date: reviewDay(review.createdAt),
    hidden: review.hidden ? "Yes" : "No",
  }));
  const detail = addTable(
    workbook,
    "Reviews",
    ACCENT,
    `${company.appName}  ·  Reviews`,
    subtitle,
    [
      { header: "Manager", key: "manager", width: 26, wrap: true },
      { header: "Title", key: "title", width: 28, wrap: true },
      { header: "Department", key: "department", width: 32, wrap: true },
      { header: "Score", key: "score", width: 10, numFmt: "0", align: "center" },
      { header: "Traits", key: "traits", width: 32, wrap: true },
      { header: "Comment", key: "comment", width: 64, wrap: true },
      { header: "Date", key: "date", width: 14, numFmt: "yyyy-mm-dd", align: "center" },
      { header: "Hidden", key: "hidden", width: 12, align: "center" },
    ],
    reviewRows,
    (row) => {
      const commentLines = linesFor(String(row.comment ?? ""), 70);
      const traitLines = linesFor(String(row.traits ?? ""), 32);
      return Math.min(96, Math.max(20, Math.max(commentLines, traitLines) * 15));
    },
  );
  reviewRows.forEach((review, index) => {
    if (review.hidden !== "Yes") return;
    const row = detail.getRow(TABLE_HEADER_ROW + 1 + index);
    const cell = row.getCell(8);
    cell.font = { name: FONT, size: 11, bold: true, color: { argb: BRAND } };
    cell.fill = solid(HIDDEN_BG);
  });

  const raw = await workbook.xlsx.writeBuffer();
  return Buffer.from(raw);
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
