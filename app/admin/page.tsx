import { notFound } from "next/navigation";
import { saveAnalysisGraphs, saveHrAccess } from "@/app/actions";
import { listHrStaff } from "@/lib/access";
import { ANALYSIS_GRAPHS, getAnalysisGraphVisibility } from "@/lib/analysis-graphs";
import { getViewer } from "@/lib/directory";

export const dynamic = "force-dynamic";

export const metadata = { title: "Access" };

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; graphs?: string; error?: string }>;
}) {
  const viewer = await getViewer();
  if (!viewer.isAdmin) notFound();
  const params = await searchParams;
  const staff = listHrStaff();
  const graphVisibility = getAnalysisGraphVisibility();

  return (
    <div>
      <h1 className="text-[28px] font-bold tracking-tight">Access</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
        Grant a colleague permission to read review comments, open Analysis, and download the report. An administrator
        (HR) already has that access. Everyone else sees scores and traits only, including people who work in Human
        Resources and are not administrators. This list never becomes part of a review.
      </p>

      {params.saved === "1" ? (
        <p className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm text-accent ring-1 ring-accent/20">Access saved.</p>
      ) : null}
      {params.graphs === "1" ? (
        <p className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm text-accent ring-1 ring-accent/20">
          Analysis graphs updated.
        </p>
      ) : null}
      {params.error === "1" ? (
        <p role="alert" className="mt-4 rounded-2xl bg-[#fdecee] px-4 py-3 text-sm text-[#d64545]">
          That change could not be saved.
        </p>
      ) : null}

      <div className="mt-6 space-y-4">
        {staff.map((person) => (
          <form
            key={person.staffId}
            action={saveHrAccess}
            className="rounded-[22px] bg-white p-5 ring-1 ring-black/[0.04] md:p-6"
          >
            <input type="hidden" name="staffId" value={person.staffId} />
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">{person.displayName}</h2>
                <p className="mt-1 text-sm text-muted">
                  {person.isAdmin ? "Administrator (HR) — full access stays on." : "Colleague"}
                </p>
              </div>
              {!person.isAdmin ? (
                <button
                  type="submit"
                  className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
                >
                  Save
                </button>
              ) : null}
            </div>
            <fieldset className="mt-4 grid gap-3 sm:grid-cols-3" disabled={person.isAdmin}>
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  name="canReadComments"
                  defaultChecked={person.canReadComments}
                  className="size-4 accent-[var(--brand)]"
                />
                Read comments
              </label>
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  name="canViewAnalysis"
                  defaultChecked={person.canViewAnalysis}
                  className="size-4 accent-[var(--brand)]"
                />
                Analysis report
              </label>
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  name="canDownloadReport"
                  defaultChecked={person.canDownloadReport}
                  className="size-4 accent-[var(--brand)]"
                />
                Download / print
              </label>
            </fieldset>
          </form>
        ))}
      </div>

      <section className="mt-10">
        <h2 className="text-[22px] font-bold tracking-tight">Analysis graphs</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Pick which charts appear on the Analysis page for people who may open it. Turning a graph off hides it for
          everyone; it does not change who may open Analysis. Charts stay anonymous — they never show a reviewer.
        </p>

        <form
          action={saveAnalysisGraphs}
          className="mt-4 rounded-[22px] bg-white p-5 ring-1 ring-black/[0.04] md:p-6"
        >
          <fieldset className="space-y-4">
            <legend className="sr-only">Visible Analysis graphs</legend>
            {ANALYSIS_GRAPHS.map((graph) => (
              <label
                key={graph.id}
                className="flex items-start gap-3 rounded-2xl bg-paper/70 px-4 py-3 ring-1 ring-line/80"
              >
                <input
                  type="checkbox"
                  name="graphs"
                  value={graph.id}
                  defaultChecked={graphVisibility[graph.id]}
                  className="mt-1 size-4 accent-[var(--brand)]"
                />
                <span>
                  <span className="block text-sm font-semibold text-ink">{graph.label}</span>
                  <span className="mt-0.5 block text-sm leading-6 text-muted">{graph.description}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <div className="mt-5 flex justify-end">
            <button
              type="submit"
              className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              Save graphs
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
