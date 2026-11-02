import { notFound } from "next/navigation";
import { AnalysisCharts } from "@/components/AnalysisCharts";
import { AnalysisDivisionFilter } from "@/components/AnalysisDivisionFilter";
import { PrintButton } from "@/components/PrintButton";
import { getAnalysisGraphVisibility } from "@/lib/analysis-graphs";
import { getViewer } from "@/lib/directory";
import { DIVISIONS, divisionName, parseDivisionParam } from "@/lib/divisions";
import { organisationReport } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata = { title: "Analysis" };

export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<{ division?: string | string[] }>;
}) {
  const viewer = await getViewer();
  if (!viewer.canViewAnalysis) notFound();
  const params = await searchParams;
  const scopeDivisionId = parseDivisionParam(params.division);
  const report = organisationReport(scopeDivisionId);
  const visibility = getAnalysisGraphVisibility();
  const scopeName = scopeDivisionId ? divisionName(scopeDivisionId) : null;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight">Analysis</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">
            Scores and traits {scopeName ? `in ${scopeName}` : "across Mintek"}. This report has no author, staff
            number, or computer.
            {viewer.canReadComments
              ? " You can open a manager to read the comments."
              : " Written comments stay closed unless Access also allows them for you."}
          </p>
        </div>
        <div className="no-print">{viewer.canDownloadReport ? <PrintButton /> : null}</div>
      </div>

      <div
        data-analysis-scope={scopeDivisionId ?? "all"}
        className="no-print mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[22px] bg-white px-4 py-3 ring-1 ring-black/[0.04]"
      >
        <AnalysisDivisionFilter divisions={DIVISIONS} current={scopeDivisionId ?? ""} />
        <p className="text-sm text-muted">
          {scopeName
            ? `Managers in ${scopeName} only. Reviews stay anonymous.`
            : "Every division. Reviews stay anonymous."}
        </p>
      </div>

      <AnalysisCharts report={report} visibility={visibility} />
    </div>
  );
}
