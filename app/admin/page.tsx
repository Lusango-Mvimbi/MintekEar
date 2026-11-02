import { notFound } from "next/navigation";
import { saveAnalysisGraphs } from "@/app/actions";
import { AccessDirectory } from "@/components/AccessDirectory";
import { listHrStaff } from "@/lib/access";
import { ANALYSIS_GRAPHS, getAnalysisGraphVisibility } from "@/lib/analysis-graphs";
import { getViewer } from "@/lib/directory";
import { divisionName } from "@/lib/divisions";
import { demoAccessDivision } from "@/lib/hr-seed";

export const dynamic = "force-dynamic";

export const metadata = { title: "Access" };

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; graphs?: string; error?: string; role?: string }>;
}) {
  const viewer = await getViewer();
  if (!viewer.isAdmin) notFound();
  const params = await searchParams;
  const staff = listHrStaff();
  const graphVisibility = getAnalysisGraphVisibility();
  const people = staff.map((person) => {
    const divisionId = demoAccessDivision(person.staffId);
    return {
      staffId: person.staffId,
      displayName: person.displayName,
      division: divisionId ? divisionName(divisionId) : null,
      isAdmin: person.isAdmin,
      canReadComments: person.canReadComments,
      canViewAnalysis: person.canViewAnalysis,
      canDownloadReport: person.canDownloadReport,
    };
  });

  return (
    <div>
      <h1 className="text-[28px] font-bold tracking-tight">Access</h1>

      {params.role === "administrator" ? (
        <p className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm text-accent ring-1 ring-accent/20">
          They are now an Administrator (HR).
        </p>
      ) : null}
      {params.role === "colleague" ? (
        <p className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm text-accent ring-1 ring-accent/20">
          Administrator access removed. They are a colleague again.
        </p>
      ) : null}
      {params.saved === "1" ? (
        <p className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm text-accent ring-1 ring-accent/20">
          Privileges saved.
        </p>
      ) : null}
      {params.graphs === "1" ? (
        <p className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm text-accent ring-1 ring-accent/20">
          Analysis graphs updated.
        </p>
      ) : null}
      {params.error === "last" ? (
        <p role="alert" className="mt-4 rounded-2xl bg-[#fdecee] px-4 py-3 text-sm text-[#d64545]">
          That person is the only Administrator (HR). Make someone else an administrator first.
        </p>
      ) : null}
      {params.error === "1" ? (
        <p role="alert" className="mt-4 rounded-2xl bg-[#fdecee] px-4 py-3 text-sm text-[#d64545]">
          That change could not be saved.
        </p>
      ) : null}

      <AccessDirectory people={people} />

      <section className="mt-10">
        <h2 className="text-[22px] font-bold tracking-tight">Analysis graphs</h2>

        <form
          action={saveAnalysisGraphs}
          className="mt-4 rounded-[22px] bg-white p-5 ring-1 ring-black/[0.04] md:p-6"
        >
          <fieldset className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <legend className="sr-only">Visible Analysis graphs</legend>
            {ANALYSIS_GRAPHS.map((graph) => (
              <label
                key={graph.id}
                className="flex items-center gap-3 rounded-2xl bg-paper/70 px-4 py-3 ring-1 ring-line/80"
              >
                <input
                  type="checkbox"
                  name="graphs"
                  value={graph.id}
                  defaultChecked={graphVisibility[graph.id]}
                  className="size-4 accent-[var(--brand)]"
                />
                <span className="text-sm font-semibold text-ink">{graph.label}</span>
              </label>
            ))}
          </fieldset>
          <div className="mt-5 flex sm:justify-end">
            <button
              type="submit"
              className="w-full rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark sm:w-auto"
            >
              Save graphs
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
