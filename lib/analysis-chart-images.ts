import { divisionName } from "./divisions";
import { formatScore, scoreTone } from "./format";
import type { OrganisationReport } from "./queries";
import { displayTrait } from "./tags";
import { renderBarChart, renderOverviewChart, type BarChartSpec, type OverviewSpec } from "./chart-png";

const SCORE_FILL = {
  good: "#0f8a4b",
  mixed: "#c4841d",
  bad: "#d64545",
} as const;

const ACCENT = "#194d5c";
const MUTED = "#5e828d";

function scopeName(report: OrganisationReport): string | null {
  if (!report.scopeDivisionId) return null;
  return (
    report.divisions.find((division) => division.divisionId === report.scopeDivisionId)?.name ??
    divisionName(report.scopeDivisionId)
  );
}

function reviewsWord(count: number): string {
  return count === 1 ? "review" : "reviews";
}

/** The same three Analysis charts, as data for a PNG. Score mix is not one of them. */
export function analysisChartSpecs(report: OrganisationReport): BarChartSpec[] {
  const scoped = scopeName(report);

  const divisionRows = report.divisions
    .filter((division) => division.reviewCount > 0 && division.average !== null)
    .sort((a, b) => (b.average ?? 0) - (a.average ?? 0) || a.name.localeCompare(b.name));

  const divisionScores: BarChartSpec = {
    title: "Division scores",
    subtitle: scoped
      ? `Average anonymous score for ${scoped}.`
      : "Average anonymous score by division. Higher bars mean stronger feedback.",
    bars: divisionRows.map((division) => {
      const average = division.average as number;
      return {
        label: division.name,
        valueLabel: formatScore(average),
        fraction: average / 5,
        color: SCORE_FILL[scoreTone(average)],
      };
    }),
    empty: scoped ? "No scored reviews in this division yet." : "No scored divisions yet.",
    axisLow: divisionRows.length > 0 ? "0" : undefined,
    axisHigh: divisionRows.length > 0 ? "5" : undefined,
  };

  const attention: BarChartSpec =
    report.attention.length === 0
      ? {
          title: "Needs attention",
          subtitle: scoped
            ? `${scoped} is listed here when its average is under 2.5.`
            : "Divisions with an average under 2.5.",
          bars: [],
          empty: scoped
            ? `${scoped} is not under the attention line.`
            : "No divisions are under the attention line right now.",
          emptyTone: "good",
        }
      : {
          title: "Needs attention",
          subtitle: scoped
            ? `${scoped} averages under 2.5.`
            : "Divisions with an average under 2.5.",
          bars: report.attention.map((division) => ({
            label: division.name,
            valueLabel: `${formatScore(division.average)} · ${division.reviewCount} ${reviewsWord(division.reviewCount)}`,
            fraction: division.average / 5,
            color: SCORE_FILL.bad,
          })),
          empty: "",
          axisLow: "0",
          axisHigh: "5",
        };

  const traitRows = report.tagCounts.slice(0, 10).flatMap((item) => {
    const tag = displayTrait(item.id);
    if (!tag) return [];
    return [{ item, tag }];
  });
  const traitMax = Math.max(...traitRows.map((row) => row.item.count), 1);
  const traits: BarChartSpec = {
    title: "Trait frequency",
    subtitle: scoped
      ? `Most mentioned traits from anonymous reviews in ${scoped}.`
      : "Most mentioned traits from anonymous reviews.",
    bars: traitRows.map(({ item, tag }) => ({
      label: tag.label,
      valueLabel: String(item.count),
      fraction: item.count / traitMax,
      color: tag.tone === "positive" ? SCORE_FILL.good : tag.tone === "negative" ? SCORE_FILL.bad : "#5e828d",
    })),
    empty: "No traits yet.",
    axisLow: traitRows.length > 0 ? "0" : undefined,
    axisHigh: traitRows.length > 0 ? String(traitMax) : undefined,
  };

  return [divisionScores, attention, traits];
}

/** Overview totals as three small cards. Not a score-mix chart. */
export function overviewChartSpec(report: OrganisationReport): OverviewSpec {
  const scoped = scopeName(report);
  const average = report.average;
  const attentionCount = report.attention.length;
  return {
    title: "Overview",
    subtitle: scoped
      ? `Visible reviews in ${scoped}. Hidden reviews are excluded.`
      : "Visible reviews across Mintek. Hidden reviews are excluded.",
    cards: [
      {
        label: "Reviews",
        value: String(report.reviewCount),
        caption: scoped ? `In ${scoped}` : "Across Mintek",
        color: ACCENT,
      },
      {
        label: "Average",
        value: average === null ? "—" : formatScore(average),
        caption: "Out of 5",
        color: average === null ? MUTED : SCORE_FILL[scoreTone(average)],
      },
      {
        label: "Needs attention",
        value: String(attentionCount),
        caption: scoped
          ? attentionCount > 0
            ? "Average under 2.5"
            : "At or above 2.5"
          : "Divisions under 2.5",
        color: attentionCount > 0 ? SCORE_FILL.bad : SCORE_FILL.good,
      },
    ],
  };
}

export type AnalysisChartPng = {
  title: string;
  png: Buffer;
  width: number;
  height: number;
};

const DISPLAY_WIDTH = 960;

function present(image: { png: Buffer; width: number; height: number }, title: string): AnalysisChartPng {
  const height = Math.max(1, Math.round(image.height * (DISPLAY_WIDTH / image.width)));
  return { title, png: image.png, width: DISPLAY_WIDTH, height };
}

export function renderAnalysisCharts(report: OrganisationReport): AnalysisChartPng[] {
  const overview = present(renderOverviewChart(overviewChartSpec(report)), "Overview");
  const bars = analysisChartSpecs(report).map((spec) => present(renderBarChart(spec), spec.title));
  return [overview, ...bars];
}
