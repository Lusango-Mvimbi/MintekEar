import { notFound } from "next/navigation";
import { saveHrAccess } from "@/app/actions";
import { listHrStaff } from "@/lib/access";
import { getViewer } from "@/lib/directory";

export const dynamic = "force-dynamic";

export const metadata = { title: "Access" };

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const viewer = await getViewer();
  if (!viewer.isAdmin) notFound();
  const params = await searchParams;
  const staff = listHrStaff();

  return (
    <div>
      <h1 className="text-[28px] font-bold tracking-tight">HR access</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
        Choose which people in Human Resources may read review comments, open Analysis, and download the report.
        Everyone else — including other HR colleagues — sees the same division view as other employees: scores and
        traits only, no written comments. This list never becomes part of a review.
      </p>

      {params.saved === "1" ? (
        <p className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm text-accent ring-1 ring-accent/20">Access saved.</p>
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
                  {person.isAdmin ? "Administrator — full access stays on." : "HR colleague"}
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
    </div>
  );
}
