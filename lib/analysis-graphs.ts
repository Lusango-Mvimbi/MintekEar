import { getDb } from "./db";

export const ANALYSIS_GRAPH_IDS = [
  "overview",
  "division-scores",
  "attention",
  "traits",
  "division-table",
  "managers",
] as const;

export type AnalysisGraphId = (typeof ANALYSIS_GRAPH_IDS)[number];

export type AnalysisGraphDefinition = {
  id: AnalysisGraphId;
  label: string;
  description: string;
  defaultEnabled: boolean;
};

/** Graphs available on Analysis. Defaults keep demos useful without showing every panel. */
export const ANALYSIS_GRAPHS: readonly AnalysisGraphDefinition[] = [
  {
    id: "overview",
    label: "Overview totals",
    description: "Review count, organisation average, and how many divisions need attention.",
    defaultEnabled: true,
  },
  {
    id: "division-scores",
    label: "Division score chart",
    description: "Average score by division as a horizontal bar chart.",
    defaultEnabled: true,
  },
  {
    id: "attention",
    label: "Needs attention",
    description: "Divisions with an average under 2.5.",
    defaultEnabled: true,
  },
  {
    id: "traits",
    label: "Trait frequency",
    description: "Most mentioned traits across Mintek.",
    defaultEnabled: true,
  },
  {
    id: "division-table",
    label: "Division comparison table",
    description: "Managers, reviews, averages, and traits by division.",
    defaultEnabled: false,
  },
  {
    id: "managers",
    label: "Managers by division",
    description: "Per-manager scores for the division you select. Hidden on All divisions.",
    defaultEnabled: true,
  },
];

export type AnalysisGraphVisibility = Record<AnalysisGraphId, boolean>;

function flag(value: unknown): boolean {
  return value === 1 || value === true || value === "1";
}

function isGraphId(value: string): value is AnalysisGraphId {
  return (ANALYSIS_GRAPH_IDS as readonly string[]).includes(value);
}

function defaultVisibility(): AnalysisGraphVisibility {
  return Object.fromEntries(ANALYSIS_GRAPHS.map((graph) => [graph.id, graph.defaultEnabled])) as AnalysisGraphVisibility;
}

export function ensureAnalysisGraphSettings() {
  const db = getDb();
  const placeholders = ANALYSIS_GRAPH_IDS.map(() => "?").join(", ");
  db.prepare(`DELETE FROM analysis_graph_settings WHERE graph_id NOT IN (${placeholders})`).run(
    ...ANALYSIS_GRAPH_IDS,
  );
  const count = db.prepare("SELECT COUNT(*) AS count FROM analysis_graph_settings").get() as {
    count: number | bigint;
  };
  if (Number(count.count) > 0) return;

  const insert = db.prepare(
    "INSERT INTO analysis_graph_settings (graph_id, enabled) VALUES (?, ?)",
  );
  for (const graph of ANALYSIS_GRAPHS) {
    insert.run(graph.id, graph.defaultEnabled ? 1 : 0);
  }
}

export function getAnalysisGraphVisibility(): AnalysisGraphVisibility {
  ensureAnalysisGraphSettings();
  const visibility = defaultVisibility();
  const rows = getDb().prepare("SELECT graph_id, enabled FROM analysis_graph_settings").all();
  for (const row of rows) {
    const id = typeof row.graph_id === "string" ? row.graph_id : "";
    if (!isGraphId(id)) continue;
    visibility[id] = flag(row.enabled);
  }
  return visibility;
}

export function isAnalysisGraphEnabled(id: AnalysisGraphId): boolean {
  return getAnalysisGraphVisibility()[id];
}

/** All divisions never shows the managers-by-division cards, even when an admin left that graph on. */
export function showManagersByDivision(scopeDivisionId: string | null, enabled: boolean): boolean {
  return enabled && typeof scopeDivisionId === "string" && scopeDivisionId.length > 0;
}

/**
 * Chart panels stack on a narrow screen. From lg, two share a row.
 * From xl, three share one row — as many of the chart panels as fit.
 */
export function analysisChartGridClass(panelCount: number): string {
  if (panelCount >= 3) return "grid min-w-0 gap-6 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3";
  if (panelCount === 2) return "grid min-w-0 gap-6 grid-cols-1 lg:grid-cols-2";
  return "grid min-w-0 gap-6 grid-cols-1";
}

export function updateAnalysisGraphVisibility(
  enabledIds: readonly string[],
): { ok: true; visibility: AnalysisGraphVisibility } | { ok: false; error: string } {
  ensureAnalysisGraphSettings();
  const enabled = new Set(enabledIds.filter(isGraphId));
  const db = getDb();
  const upsert = db.prepare(
    `INSERT INTO analysis_graph_settings (graph_id, enabled) VALUES (?, ?)
     ON CONFLICT(graph_id) DO UPDATE SET enabled = excluded.enabled`,
  );
  db.exec("BEGIN IMMEDIATE");
  try {
    for (const graph of ANALYSIS_GRAPHS) {
      upsert.run(graph.id, enabled.has(graph.id) ? 1 : 0);
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  return { ok: true, visibility: getAnalysisGraphVisibility() };
}
