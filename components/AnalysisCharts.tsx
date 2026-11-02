import type { ReactNode } from "react";
import Link from "next/link";
import { TagPills } from "@/components/TagPills";
import type { AnalysisGraphVisibility } from "@/lib/analysis-graphs";
import { formatScore, scoreTone } from "@/lib/format";
import type { OrganisationReport } from "@/lib/queries";
import { tagById } from "@/lib/tags";

const SCORE_FILL = {
  good: "#0f8a4b",
  mixed: "#c4841d",
  bad: "#d64545",
} as const;

const RATING_FILL: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: "#d64545",
  2: "#e07a3a",
  3: "#c4841d",
  4: "#3d9b6e",
  5: "#0f8a4b",
};

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[22px] bg-white p-5 ring-1 ring-black/[0.04] md:p-6">
      <header className="mb-5">
        <h2 className="text-[15px] font-bold tracking-tight text-ink">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm leading-6 text-muted">{subtitle}</p> : null}
      </header>
      {children}
    </section>
  );
}

function OverviewCards({ report }: { report: OrganisationReport }) {
  const averageTone = report.average === null ? null : scoreTone(report.average);
  const averageColor = averageTone ? SCORE_FILL[averageTone] : "var(--muted)";

  return (
    <section className="grid gap-4 sm:grid-cols-3" aria-label="Organisation overview">
      <div className="relative overflow-hidden rounded-[22px] bg-white p-6 ring-1 ring-black/[0.04]">
        <div className="absolute inset-x-0 top-0 h-1 bg-accent" aria-hidden />
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Reviews</p>
        <p className="mt-2 text-[2rem] font-bold leading-none tracking-tight tabular-nums">{report.reviewCount}</p>
        <p className="mt-2 text-sm text-muted">Anonymous scores across Mintek</p>
      </div>
      <div className="relative overflow-hidden rounded-[22px] bg-white p-6 ring-1 ring-black/[0.04]">
        <div className="absolute inset-x-0 top-0 h-1" style={{ background: averageColor }} aria-hidden />
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Average</p>
        <p className="mt-2 text-[2rem] font-bold leading-none tracking-tight tabular-nums" style={{ color: averageColor }}>
          {report.average === null ? "—" : formatScore(report.average)}
        </p>
        <p className="mt-2 text-sm text-muted">Out of 5 across visible reviews</p>
      </div>
      <div className="relative overflow-hidden rounded-[22px] bg-white p-6 ring-1 ring-black/[0.04]">
        <div
          className="absolute inset-x-0 top-0 h-1"
          style={{ background: report.attention.length > 0 ? SCORE_FILL.bad : SCORE_FILL.good }}
          aria-hidden
        />
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Needs attention</p>
        <p
          className="mt-2 text-[2rem] font-bold leading-none tracking-tight tabular-nums"
          style={{ color: report.attention.length > 0 ? SCORE_FILL.bad : SCORE_FILL.good }}
        >
          {report.attention.length}
        </p>
        <p className="mt-2 text-sm text-muted">Divisions averaging under 2.5</p>
      </div>
    </section>
  );
}

function DivisionScoreChart({ report }: { report: OrganisationReport }) {
  const rows = report.divisions
    .filter((division) => division.reviewCount > 0 && division.average !== null)
    .sort((a, b) => (b.average ?? 0) - (a.average ?? 0) || a.name.localeCompare(b.name));

  if (rows.length === 0) {
    return (
      <Panel title="Division scores" subtitle="Averages appear once a division has reviews.">
        <p className="text-sm text-muted">No scored divisions yet.</p>
      </Panel>
    );
  }

  const max = 5;
  const rowHeight = 44;
  const labelWidth = 168;
  const chartWidth = 640;
  const barMax = chartWidth - labelWidth - 72;
  const height = rows.length * rowHeight + 28;

  return (
    <Panel title="Division scores" subtitle="Average anonymous score by division. Higher bars mean stronger feedback.">
      <div className="overflow-x-auto">
        <svg
          role="img"
          aria-label="Bar chart of average scores by division"
          viewBox={`0 0 ${chartWidth} ${height}`}
          className="h-auto w-full min-w-[520px]"
        >
          {[1, 2, 3, 4, 5].map((tick) => {
            const x = labelWidth + (tick / max) * barMax;
            return (
              <g key={tick}>
                <line x1={x} y1={0} x2={x} y2={height - 22} stroke="var(--line)" strokeWidth="1" />
                <text x={x} y={height - 6} textAnchor="middle" className="fill-[var(--muted)] text-[11px]">
                  {tick}
                </text>
              </g>
            );
          })}
          {rows.map((division, index) => {
            const average = division.average as number;
            const tone = scoreTone(average);
            const y = index * rowHeight + 8;
            const width = Math.max(8, (average / max) * barMax);
            return (
              <g key={division.divisionId}>
                <text
                  x={0}
                  y={y + 18}
                  className="fill-[var(--ink)] text-[12px] font-semibold"
                >
                  {division.name.length > 22 ? `${division.name.slice(0, 20)}…` : division.name}
                </text>
                <rect
                  x={labelWidth}
                  y={y + 4}
                  width={barMax}
                  height={22}
                  rx={11}
                  fill="var(--paper)"
                />
                <rect
                  x={labelWidth}
                  y={y + 4}
                  width={width}
                  height={22}
                  rx={11}
                  fill={SCORE_FILL[tone]}
                />
                <text
                  x={labelWidth + width + 10}
                  y={y + 19}
                  className="fill-[var(--ink)] text-[12px] font-bold"
                >
                  {formatScore(average)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </Panel>
  );
}

function RatingMixChart({ report }: { report: OrganisationReport }) {
  const total = report.ratingMix.reduce((sum, bucket) => sum + bucket.count, 0);
  if (total === 0) {
    return (
      <Panel title="Score mix" subtitle="How reviews land across the 1–5 scale.">
        <p className="text-sm text-muted">No reviews yet.</p>
      </Panel>
    );
  }

  const maxCount = Math.max(...report.ratingMix.map((bucket) => bucket.count), 1);
  const chartHeight = 180;
  const chartWidth = 520;
  const padX = 36;
  const padTop = 24;
  const padBottom = 36;
  const barGap = 18;
  const usable = chartWidth - padX * 2;
  const barWidth = (usable - barGap * 4) / 5;

  return (
    <Panel title="Score mix" subtitle="Count of anonymous reviews on each score. No author is shown.">
      <div className="overflow-x-auto">
        <svg
          role="img"
          aria-label="Column chart of review counts for scores one through five"
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="h-auto w-full min-w-[420px]"
        >
          {report.ratingMix.map((bucket, index) => {
            const x = padX + index * (barWidth + barGap);
            const plotHeight = chartHeight - padTop - padBottom;
            const height = Math.max(bucket.count === 0 ? 0 : 8, (bucket.count / maxCount) * plotHeight);
            const y = padTop + plotHeight - height;
            const pct = Math.round((bucket.count / total) * 100);
            return (
              <g key={bucket.rating}>
                <rect x={x} y={y} width={barWidth} height={height} rx={10} fill={RATING_FILL[bucket.rating]} />
                <text
                  x={x + barWidth / 2}
                  y={y - 8}
                  textAnchor="middle"
                  className="fill-[var(--ink)] text-[12px] font-bold"
                >
                  {bucket.count}
                </text>
                <text
                  x={x + barWidth / 2}
                  y={chartHeight - 18}
                  textAnchor="middle"
                  className="fill-[var(--ink)] text-[13px] font-bold"
                >
                  {bucket.rating}
                </text>
                <text
                  x={x + barWidth / 2}
                  y={chartHeight - 4}
                  textAnchor="middle"
                  className="fill-[var(--muted)] text-[10px]"
                >
                  {pct}%
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <ul className="sr-only">
        {report.ratingMix.map((bucket) => (
          <li key={bucket.rating}>
            Score {bucket.rating}: {bucket.count} reviews
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function AttentionPanel({ report }: { report: OrganisationReport }) {
  if (report.attention.length === 0) {
    return (
      <Panel title="Needs attention" subtitle="Divisions with an average under 2.5.">
        <div className="flex items-center gap-3 rounded-2xl bg-[#e7f6ee] px-4 py-3 text-sm font-semibold text-[#0f8a4b]">
          <span className="inline-flex size-2.5 rounded-full bg-[#0f8a4b]" aria-hidden />
          No divisions are under the attention line right now.
        </div>
      </Panel>
    );
  }

  const worst = Math.min(...report.attention.map((division) => division.average));

  return (
    <Panel title="Needs attention" subtitle="Divisions with an average under 2.5. Open a manager to read the words if Access allows it.">
      <ul className="space-y-3">
        {report.attention.map((division) => {
          const width = Math.max(12, (division.average / 5) * 100);
          return (
            <li key={division.divisionId} className="rounded-2xl bg-[#fdecee]/70 px-4 py-3 ring-1 ring-[#d64545]/15">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-semibold text-ink">{division.name}</span>
                <span className="text-sm font-semibold text-[#d64545]">
                  {formatScore(division.average)} · {division.reviewCount}{" "}
                  {division.reviewCount === 1 ? "review" : "reviews"}
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                <div
                  className="h-full rounded-full bg-[#d64545]"
                  style={{ width: `${width}%` }}
                  aria-hidden
                />
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-muted">Lowest average in this list: {formatScore(worst)}.</p>
    </Panel>
  );
}

function TraitFrequencyChart({ report }: { report: OrganisationReport }) {
  const rows = report.tagCounts.slice(0, 10);
  if (rows.length === 0) {
    return (
      <Panel title="Trait frequency" subtitle="Most mentioned traits from anonymous reviews.">
        <p className="text-sm text-muted">No traits yet.</p>
      </Panel>
    );
  }

  const max = Math.max(...rows.map((tag) => tag.count), 1);

  return (
    <Panel title="Trait frequency" subtitle="Most mentioned traits from anonymous reviews.">
      <ul className="space-y-3">
        {rows.map((item) => {
          const tag = tagById(item.id);
          if (!tag) return null;
          const positive = tag.tone === "positive";
          const width = Math.max(8, (item.count / max) * 100);
          return (
            <li key={item.id}>
              <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                <span className="font-semibold text-ink">{tag.label}</span>
                <span className="tabular-nums text-muted">{item.count}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-paper">
                <div
                  className={`h-full rounded-full ${positive ? "bg-[#0f8a4b]" : "bg-[#d64545]"}`}
                  style={{ width: `${width}%` }}
                  aria-hidden
                />
              </div>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

function DivisionTable({ report }: { report: OrganisationReport }) {
  return (
    <Panel title="Division comparison" subtitle="Managers, reviews, averages, and leading traits.">
      <div className="-mx-5 overflow-x-auto md:-mx-6">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="text-muted">
            <tr className="border-b border-line">
              <th className="px-5 py-3 font-semibold md:px-6">Division</th>
              <th className="px-4 py-3 font-semibold">Managers</th>
              <th className="px-4 py-3 font-semibold">Reviews</th>
              <th className="px-4 py-3 font-semibold">Average</th>
              <th className="px-5 py-3 font-semibold md:px-6">Traits</th>
            </tr>
          </thead>
          <tbody>
            {report.divisions.map((division) => {
              const tone = division.average === null ? null : scoreTone(division.average);
              return (
                <tr key={division.divisionId} className="border-b border-line/80 align-top last:border-0">
                  <th className="px-5 py-3 font-semibold text-ink md:px-6">{division.name}</th>
                  <td className="px-4 py-3 tabular-nums">{division.managerCount}</td>
                  <td className="px-4 py-3 tabular-nums">{division.reviewCount}</td>
                  <td className="px-4 py-3">
                    {division.average === null ? (
                      <span className="text-muted">—</span>
                    ) : (
                      <span className="font-semibold tabular-nums" style={{ color: tone ? SCORE_FILL[tone] : undefined }}>
                        {formatScore(division.average)}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 md:px-6">
                    <TagPills tags={division.tagCounts.slice(0, 3)} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function ManagersByDivision({ report }: { report: OrganisationReport }) {
  const divisions = report.divisions.filter((division) => division.managers.length > 0);
  if (divisions.length === 0) return null;

  return (
    <div className="space-y-6">
      {divisions.map((division) => (
        <Panel
          key={division.divisionId}
          title={division.name}
          subtitle={
            division.average === null
              ? "No scored reviews in this division yet."
              : `Division average ${formatScore(division.average)} · ${division.reviewCount} ${
                  division.reviewCount === 1 ? "review" : "reviews"
                }`
          }
        >
          <ul className="divide-y divide-line/80">
            {division.managers.map((manager) => {
              const tone = manager.average === null ? null : scoreTone(manager.average);
              return (
                <li key={manager.id} className="flex flex-wrap items-baseline justify-between gap-2 py-3 first:pt-0 last:pb-0">
                  <div>
                    <Link href={`/managers/${manager.id}`} className="font-bold text-ink hover:text-accent">
                      {manager.name}
                    </Link>
                    <p className="mt-0.5 text-sm text-muted">{manager.title}</p>
                  </div>
                  <span
                    className="text-sm font-semibold tabular-nums"
                    style={{ color: tone ? SCORE_FILL[tone] : "var(--muted)" }}
                  >
                    {manager.average === null ? "No reviews yet" : formatScore(manager.average)} ·{" "}
                    {manager.reviewCount} {manager.reviewCount === 1 ? "review" : "reviews"}
                  </span>
                </li>
              );
            })}
          </ul>
        </Panel>
      ))}
    </div>
  );
}

export function AnalysisCharts({
  report,
  visibility,
}: {
  report: OrganisationReport;
  visibility: AnalysisGraphVisibility;
}) {
  const anyEnabled = Object.values(visibility).some(Boolean);

  if (!anyEnabled) {
    return (
      <section className="mt-6 rounded-[22px] bg-white p-6 ring-1 ring-black/[0.04]">
        <h2 className="text-sm font-bold">No graphs selected</h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          An administrator can turn Analysis graphs on from the Access page.
        </p>
      </section>
    );
  }

  return (
    <div className="mt-6 space-y-6">
      {visibility.overview ? <OverviewCards report={report} /> : null}
      {visibility["division-scores"] && visibility["rating-mix"] ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <DivisionScoreChart report={report} />
          <RatingMixChart report={report} />
        </div>
      ) : (
        <>
          {visibility["division-scores"] ? <DivisionScoreChart report={report} /> : null}
          {visibility["rating-mix"] ? <RatingMixChart report={report} /> : null}
        </>
      )}
      {visibility.attention ? <AttentionPanel report={report} /> : null}
      {visibility.traits ? <TraitFrequencyChart report={report} /> : null}
      {visibility["division-table"] ? <DivisionTable report={report} /> : null}
      {visibility.managers ? <ManagersByDivision report={report} /> : null}
    </div>
  );
}
