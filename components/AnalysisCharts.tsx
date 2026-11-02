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

function scopedDivision(report: OrganisationReport) {
  if (!report.scopeDivisionId) return null;
  return report.divisions.find((division) => division.divisionId === report.scopeDivisionId) ?? null;
}

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
    <section className="min-w-0 rounded-[22px] bg-white p-5 ring-1 ring-black/[0.04] md:p-6">
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
  const scoped = scopedDivision(report);

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Organisation overview">
      <div className="relative overflow-hidden rounded-[22px] bg-white p-6 ring-1 ring-black/[0.04]">
        <div className="absolute inset-x-0 top-0 h-1 bg-accent" aria-hidden />
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Reviews</p>
        <p className="mt-2 text-[2rem] font-bold leading-none tracking-tight tabular-nums">{report.reviewCount}</p>
        <p className="mt-2 text-sm text-muted">
          {scoped ? `Anonymous scores in ${scoped.name}` : "Anonymous scores across Mintek"}
        </p>
      </div>
      <div className="relative overflow-hidden rounded-[22px] bg-white p-6 ring-1 ring-black/[0.04]">
        <div className="absolute inset-x-0 top-0 h-1" style={{ background: averageColor }} aria-hidden />
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Average</p>
        <p className="mt-2 text-[2rem] font-bold leading-none tracking-tight tabular-nums" style={{ color: averageColor }}>
          {report.average === null ? "—" : formatScore(report.average)}
        </p>
        <p className="mt-2 text-sm text-muted">
          {scoped ? "Out of 5 in this division" : "Out of 5 across visible reviews"}
        </p>
      </div>
      <div className="relative overflow-hidden rounded-[22px] bg-white p-6 ring-1 ring-black/[0.04] sm:col-span-2 xl:col-span-1">
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
        <p className="mt-2 text-sm text-muted">
          {scoped
            ? report.attention.length > 0
              ? "This division averages under 2.5"
              : "This division is at or above 2.5"
            : "Divisions averaging under 2.5"}
        </p>
      </div>
    </section>
  );
}

function DivisionScoreChart({ report }: { report: OrganisationReport }) {
  const scoped = scopedDivision(report);
  const rows = report.divisions
    .filter((division) => division.reviewCount > 0 && division.average !== null)
    .sort((a, b) => (b.average ?? 0) - (a.average ?? 0) || a.name.localeCompare(b.name));

  if (rows.length === 0) {
    return (
      <Panel
        title="Division scores"
        subtitle={scoped ? `Averages appear once ${scoped.name} has reviews.` : "Averages appear once a division has reviews."}
      >
        <p className="text-sm text-muted">{scoped ? "No scored reviews in this division yet." : "No scored divisions yet."}</p>
      </Panel>
    );
  }

  const max = 5;

  return (
    <Panel
      title="Division scores"
      subtitle={
        scoped
          ? `Average anonymous score for ${scoped.name}.`
          : "Average anonymous score by division. Higher bars mean stronger feedback."
      }
    >
      <ul className="space-y-4" aria-label="Bar chart of average scores by division">
        {rows.map((division) => {
          const average = division.average as number;
          const tone = scoreTone(average);
          const width = Math.max(8, (average / max) * 100);
          return (
            <li key={division.divisionId} className="min-w-0">
              <div className="mb-1.5 flex items-start justify-between gap-3">
                <span className="min-w-0 text-sm leading-5 font-semibold break-words text-ink">{division.name}</span>
                <span className="shrink-0 text-sm font-bold tabular-nums">{formatScore(average)}</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-paper">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${width}%`, background: SCORE_FILL[tone] }}
                />
              </div>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex justify-between text-[11px] font-semibold text-muted" aria-hidden>
        <span>0</span>
        <span>5</span>
      </div>
    </Panel>
  );
}

function AttentionPanel({ report }: { report: OrganisationReport }) {
  const scoped = scopedDivision(report);
  if (report.attention.length === 0) {
    return (
      <Panel
        title="Needs attention"
        subtitle={scoped ? `${scoped.name} is listed here when its average is under 2.5.` : "Divisions with an average under 2.5."}
      >
        <div className="flex items-center gap-3 rounded-2xl bg-[#e7f6ee] px-4 py-3 text-sm font-semibold text-[#0f8a4b]">
          <span className="inline-flex size-2.5 rounded-full bg-[#0f8a4b]" aria-hidden />
          {scoped ? `${scoped.name} is not under the attention line.` : "No divisions are under the attention line right now."}
        </div>
      </Panel>
    );
  }

  const worst = Math.min(...report.attention.map((division) => division.average));

  return (
    <Panel
      title="Needs attention"
      subtitle={
        scoped
          ? `${scoped.name} averages under 2.5. Open a manager to read the words if Access allows it.`
          : "Divisions with an average under 2.5. Open a manager to read the words if Access allows it."
      }
    >
      <ul className="space-y-3">
        {report.attention.map((division) => {
          const width = Math.max(12, (division.average / 5) * 100);
          return (
            <li key={division.divisionId} className="rounded-2xl bg-[#fdecee]/70 px-4 py-3 ring-1 ring-[#d64545]/15">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="min-w-0 font-semibold break-words text-ink">{division.name}</span>
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
  const scoped = scopedDivision(report);
  const subtitle = scoped
    ? `Most mentioned traits from anonymous reviews in ${scoped.name}.`
    : "Most mentioned traits from anonymous reviews.";
  const rows = report.tagCounts.slice(0, 10);
  if (rows.length === 0) {
    return (
      <Panel title="Trait frequency" subtitle={subtitle}>
        <p className="text-sm text-muted">No traits yet.</p>
      </Panel>
    );
  }

  const max = Math.max(...rows.map((tag) => tag.count), 1);

  return (
    <Panel title="Trait frequency" subtitle={subtitle}>
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
  const scoped = scopedDivision(report);
  return (
    <Panel
      title="Division comparison"
      subtitle={
        scoped
          ? `Managers, reviews, average, and leading traits in ${scoped.name}.`
          : "Managers, reviews, averages, and leading traits."
      }
    >
      <ul className="space-y-3 md:hidden">
        {report.divisions.map((division) => {
          const tone = division.average === null ? null : scoreTone(division.average);
          return (
            <li key={division.divisionId} className="min-w-0 rounded-2xl bg-paper/70 px-4 py-3">
              <p className="font-semibold break-words text-ink">{division.name}</p>
              <dl className="mt-2 grid grid-cols-3 gap-2 text-sm">
                <div>
                  <dt className="text-xs text-muted">Managers</dt>
                  <dd className="font-semibold tabular-nums">{division.managerCount}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Reviews</dt>
                  <dd className="font-semibold tabular-nums">{division.reviewCount}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Average</dt>
                  <dd>
                    {division.average === null ? (
                      <span className="text-muted">—</span>
                    ) : (
                      <span className="font-semibold tabular-nums" style={{ color: tone ? SCORE_FILL[tone] : undefined }}>
                        {formatScore(division.average)}
                      </span>
                    )}
                  </dd>
                </div>
              </dl>
              <div className="mt-2">
                <TagPills tags={division.tagCounts.slice(0, 3)} />
              </div>
            </li>
          );
        })}
      </ul>
      <div className="-mx-5 hidden overflow-x-auto md:-mx-6 md:block">
        <table className="w-full text-left text-sm">
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
                  <th className="px-5 py-3 font-semibold break-words text-ink md:px-6">{division.name}</th>
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
    <div className={divisions.length > 1 ? "grid gap-6 xl:grid-cols-2" : "space-y-6"}>
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
          <ul className="min-w-0">
            {division.managers.map((manager) => {
              const tone = manager.average === null ? null : scoreTone(manager.average);
              return (
                <li key={manager.id} className="flex min-w-0 flex-wrap items-baseline justify-between gap-2 border-b border-line/80 py-3 last:border-0">
                  <div>
                    <Link href={`/managers/${manager.id}`} className="font-bold break-words text-ink hover:text-accent">
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
    <div className="mt-6 min-w-0 space-y-6">
      {visibility.overview ? <OverviewCards report={report} /> : null}
      {visibility["division-scores"] ? <DivisionScoreChart report={report} /> : null}
      <MaybePair
        at="xl"
        first={visibility.attention ? <AttentionPanel report={report} /> : null}
        second={visibility.traits ? <TraitFrequencyChart report={report} /> : null}
      />
      {visibility["division-table"] ? <DivisionTable report={report} /> : null}
      {visibility.managers ? <ManagersByDivision report={report} /> : null}
    </div>
  );
}

function MaybePair({
  at,
  first,
  second,
}: {
  at: "lg" | "xl";
  first: ReactNode;
  second: ReactNode;
}) {
  if (!first && !second) return null;
  if (first && second) {
    const columns = at === "xl" ? "xl:grid-cols-2" : "lg:grid-cols-2";
    return (
      <div className={`grid min-w-0 items-start gap-6 ${columns}`}>
        <div className="min-w-0">{first}</div>
        <div className="min-w-0">{second}</div>
      </div>
    );
  }
  return <div className="min-w-0">{first || second}</div>;
}
