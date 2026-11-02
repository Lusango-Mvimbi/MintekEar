import { notFound } from "next/navigation";
import { AnalysisCharts } from "@/components/AnalysisCharts";
import { AnalysisDivisionFilter } from "@/components/AnalysisDivisionFilter";
import { PrintButton } from "@/components/PrintButton";
import { getAnalysisGraphVisibility } from "@/lib/analysis-graphs";
import { getViewer } from "@/lib/directory";
import { DIVISIONS, parseDivisionParam } from "@/lib/divisions";
import { organisationReport } from "@/lib/queries";
import { canDownloadExcelReport, excelDownloadHref } from "@/lib/report-excel";

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
  const excelAllowed = canDownloadExcelReport(viewer);

  return (
    <div className="min-w-0">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">Analysis</h1>
        <div className="no-print flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
          {excelAllowed ? (
            <a
              href={excelDownloadHref(scopeDivisionId)}
              className="inline-flex w-full items-center justify-center rounded-full bg-accent px-4 py-2 text-center text-sm font-semibold text-white hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:w-auto"
            >
              Download Excel
            </a>
          ) : null}
          {viewer.canDownloadReport ? <PrintButton className="w-full sm:w-auto" /> : null}
        </div>
      </div>
      <div
        data-analysis-scope={scopeDivisionId ?? "all"}
        className="no-print mt-5 flex flex-col gap-3 rounded-[22px] bg-white px-4 py-3 ring-1 ring-black/[0.04] sm:flex-row sm:flex-wrap sm:items-center"
      >
        <AnalysisDivisionFilter divisions={DIVISIONS} current={scopeDivisionId ?? ""} />
      </div>

      <AnalysisCharts report={report} visibility={visibility} />
    </div>
  );
}
