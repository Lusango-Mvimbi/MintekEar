import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/PrintButton";
import { TagPills } from "@/components/TagPills";
import { getViewer } from "@/lib/directory";
import { formatScore } from "@/lib/format";
import { organisationReport } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata = { title: "Analysis" };

export default async function ReportPage() {
  const viewer = await getViewer();
  if (!viewer.canViewAnalysis) notFound();
  const report = organisationReport();

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight">Analysis</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">
            Scores and traits across Mintek. This report has no author, staff number, or computer.
            {viewer.canReadComments
              ? " You can open a manager to read the comments."
              : " Written comments stay closed unless Access also allows them for you."}
          </p>
        </div>
        <div className="no-print">
          {viewer.canDownloadReport ? <PrintButton /> : null}
        </div>
      </div>

      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-[22px] bg-white p-6 ring-1 ring-black/[0.04]">
          <p className="text-sm text-muted">Reviews</p>
          <p className="mt-1 text-3xl font-bold">{report.reviewCount}</p>
        </div>
        <div className="rounded-[22px] bg-white p-6 ring-1 ring-black/[0.04]">
          <p className="text-sm text-muted">Average</p>
          <p className="mt-1 text-3xl font-bold">{report.average === null ? "—" : formatScore(report.average)}</p>
        </div>
        <div className="rounded-[22px] bg-white p-6 ring-1 ring-black/[0.04]">
          <p className="text-sm text-muted">Divisions needing attention</p>
          <p className="mt-1 text-3xl font-bold">{report.attention.length}</p>
        </div>
      </section>

      {report.attention.length > 0 ? (
        <section className="mt-6 rounded-[22px] bg-[#fdecee] p-6 ring-1 ring-[#d64545]/20">
          <h2 className="text-sm font-bold text-[#d64545]">Needs attention</h2>
          <p className="mt-1 text-sm text-muted">Divisions with an average under 2.5. Open a manager to read the words.</p>
          <ul className="mt-4 space-y-2">
            {report.attention.map((division) => (
              <li key={division.divisionId} className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <span className="font-semibold text-ink">{division.name}</span>
                <span className="font-semibold text-[#d64545]">
                  {formatScore(division.average)} · {division.reviewCount}{" "}
                  {division.reviewCount === 1 ? "review" : "reviews"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {report.tagCounts.length > 0 ? (
        <section className="mt-6 rounded-[22px] bg-white p-6 ring-1 ring-black/[0.04]">
          <h2 className="text-sm font-bold">Traits across Mintek</h2>
          <p className="mt-1 text-sm text-muted">Most mentioned traits from anonymous reviews.</p>
          <div className="mt-3">
            <TagPills tags={report.tagCounts.slice(0, 10)} />
          </div>
        </section>
      ) : null}

      <div className="mt-6 overflow-x-auto rounded-[22px] bg-white ring-1 ring-black/[0.04]">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="text-muted">
            <tr className="border-b border-line">
              <th className="px-4 py-3 font-semibold">Division</th>
              <th className="px-4 py-3 font-semibold">Managers</th>
              <th className="px-4 py-3 font-semibold">Reviews</th>
              <th className="px-4 py-3 font-semibold">Average</th>
              <th className="px-4 py-3 font-semibold">Traits</th>
            </tr>
          </thead>
          <tbody>
            {report.divisions.map((division) => (
              <tr key={division.divisionId} className="border-b border-line/80 align-top">
                <th className="px-4 py-3 font-semibold text-ink">{division.name}</th>
                <td className="px-4 py-3">{division.managerCount}</td>
                <td className="px-4 py-3">{division.reviewCount}</td>
                <td className="px-4 py-3">{division.average === null ? "—" : formatScore(division.average)}</td>
                <td className="px-4 py-3">
                  <TagPills tags={division.tagCounts.slice(0, 3)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 space-y-8">
        {report.divisions
          .filter((division) => division.managers.length > 0)
          .map((division) => (
            <section key={division.divisionId}>
              <h2 className="text-lg font-bold">{division.name}</h2>
              <ul className="mt-3 space-y-3">
                {division.managers.map((manager) => (
                  <li key={manager.id} className="rounded-2xl bg-white px-4 py-4 ring-1 ring-black/[0.04]">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <Link href={`/managers/${manager.id}`} className="font-bold text-ink">
                        {manager.name}
                      </Link>
                      <span className="text-sm font-semibold text-muted">
                        {manager.average === null ? "No reviews yet" : formatScore(manager.average)} ·{" "}
                        {manager.reviewCount} {manager.reviewCount === 1 ? "review" : "reviews"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted">{manager.title}</p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
      </div>
    </div>
  );
}
