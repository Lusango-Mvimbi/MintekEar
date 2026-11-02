import { notFound } from "next/navigation";
import { saveAnalysisGraphs, saveHrAccess, saveHrRole } from "@/app/actions";
import { listHrStaff, type HrStaff } from "@/lib/access";
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
  const admins = staff.filter((person) => person.isAdmin);
  const colleagues = staff.filter((person) => !person.isAdmin);
  const onlyAdminId = admins.length === 1 ? admins[0].staffId : null;

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

      <section id="make-administrator" className="mt-8">
        <h2 className="text-[22px] font-bold tracking-tight">Colleagues</h2>
        <div className="mt-4 space-y-4">
          {colleagues.length === 0 ? (
            <p className="rounded-[22px] bg-white px-5 py-4 text-sm text-muted ring-1 ring-black/[0.04]">
              Everyone on this list is an Administrator (HR).
            </p>
          ) : (
            colleagues.map((person) => <PersonAccess key={person.staffId} person={person} onlyAdmin={false} />)
          )}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-[22px] font-bold tracking-tight">Administrators</h2>
        <div className="mt-4 space-y-4">
          {admins.map((person) => (
            <PersonAccess key={person.staffId} person={person} onlyAdmin={person.staffId === onlyAdminId} />
          ))}
        </div>
      </section>

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

function PersonAccess({ person, onlyAdmin }: { person: HrStaff; onlyAdmin: boolean }) {
  const divisionId = demoAccessDivision(person.staffId);
  const place = divisionId ? divisionName(divisionId) : null;
  const roleLabel = person.isAdmin ? "Administrator (HR)" : "Colleague";

  return (
    <article className="rounded-[22px] bg-white p-5 ring-1 ring-black/[0.04] md:p-6">
      <h3 className="text-lg font-bold">{person.displayName}</h3>
      <p className="mt-1 text-sm text-muted">
        {roleLabel}
        {place ? ` · ${place}` : ""}
      </p>

      {person.isAdmin ? (
        <div className="mt-4 rounded-2xl bg-paper px-4 py-4 ring-1 ring-line">
          <p className="text-[11px] font-bold tracking-[0.14em] text-muted uppercase">Role</p>
          {onlyAdmin ? (
            <p className="mt-2 text-sm text-muted">Only administrator.</p>
          ) : (
            <form action={saveHrRole} className="mt-3">
              <input type="hidden" name="staffId" value={person.staffId} />
              <input type="hidden" name="role" value="colleague" />
              <button
                type="submit"
                aria-label={`Remove administrator from ${person.displayName}`}
                className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink ring-1 ring-line hover:bg-paper"
              >
                Remove administrator
              </button>
            </form>
          )}
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-[#fdecee] px-4 py-4 ring-1 ring-[#d22d20]/25 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] font-bold tracking-[0.14em] text-[#a51f16] uppercase">Role</p>
          <form action={saveHrRole} className="w-full shrink-0 sm:w-auto">
            <input type="hidden" name="staffId" value={person.staffId} />
            <input type="hidden" name="role" value="administrator" />
            <button
              type="submit"
              aria-label={`Make ${person.displayName} an administrator`}
              className="w-full rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark sm:w-auto"
            >
              Make administrator
            </button>
          </form>
        </div>
      )}

      {person.isAdmin ? null : (
        <form action={saveHrAccess} className="mt-4">
          <input type="hidden" name="staffId" value={person.staffId} />
          <fieldset>
            <legend className="text-sm font-semibold text-ink">Privileges</legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
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
            </div>
          </fieldset>
          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink ring-1 ring-line hover:bg-paper"
            >
              Save privileges
            </button>
          </div>
        </form>
      )}
    </article>
  );
}
