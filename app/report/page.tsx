import { notFound } from "next/navigation";
import { AnalysisCharts } from "@/components/AnalysisCharts";
import { PrintButton } from "@/components/PrintButton";
import { getAnalysisGraphVisibility } from "@/lib/analysis-graphs";
import { getViewer } from "@/lib/directory";
import { organisationReport } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata = { title: "Analysis" };

export default async function ReportPage() {
  const viewer = await getViewer();
  if (!viewer.canViewAnalysis) notFound();
  const report = organisationReport();
  const visibility = getAnalysisGraphVisibility();

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

      <AnalysisCharts report={report} visibility={visibility} />
    </div>
  );
}
