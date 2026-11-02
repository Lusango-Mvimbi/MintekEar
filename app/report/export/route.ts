import { getViewer } from "@/lib/directory";
import { exportAnalysisExcel } from "@/lib/report-excel";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const viewer = await getViewer();
  const division = new URL(request.url).searchParams.get("division");
  const result = await exportAnalysisExcel(viewer, division);
  if (!result.ok) {
    return new Response(result.message, {
      status: result.status,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }

  return new Response(new Uint8Array(result.body), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${result.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
