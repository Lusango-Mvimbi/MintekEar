import Link from "next/link";
import { ReviewCard } from "@/components/ReviewCard";
import { company } from "@/lib/company";
import { getViewer } from "@/lib/directory";
import { divisionName } from "@/lib/divisions";
import { listFeed } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q : "";
  const viewer = await getViewer();

  if (!viewer.divisionId) {
    return (
      <div className="rounded-[22px] bg-white px-6 py-12 shadow-[0_10px_30px_rgba(0,19,29,0.05)] ring-1 ring-black/[0.04]">
        <h1 className="text-2xl font-bold tracking-tight">Waiting for the employee directory</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
          {company.appName} will show each person the reviews for their own division. The Mintek employee list is not
          connected yet, so there is nothing to open. A review will still store only the score, the words, and the day.
        </p>
      </div>
    );
  }

  const division = divisionName(viewer.divisionId);
  const managers = listFeed(viewer.divisionId, query);
  const showingExamples = managers.some((manager) => manager.sample);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight">Manager reviews</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">
            {division}. {company.tagline}
          </p>
        </div>
        <form action="/" className="flex items-center gap-2">
          <label className="sr-only" htmlFor="q">
            Search managers
          </label>
          <input
            id="q"
            name="q"
            defaultValue={query}
            placeholder="Search by name or role"
            className="w-full rounded-full border border-line bg-white px-4 py-2.5 text-sm outline-none focus:border-accent sm:w-64"
          />
          <button type="submit" className="rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-white">
            Search
          </button>
          {query ? (
            <Link href="/" className="text-sm font-semibold text-accent">
              Clear
            </Link>
          ) : null}
        </form>
      </div>

      {viewer.source === "preview" ? (
        <p className="no-print mb-4 rounded-2xl bg-white px-4 py-3 text-sm leading-6 text-muted ring-1 ring-line">
          Previewing {division}. Once the employee directory is connected, this switch disappears and each person sees
          only their own division. Human Resources can open the analysis report.
        </p>
      ) : null}

      {showingExamples ? (
        <p className="mb-4 rounded-2xl bg-white px-4 py-3 text-sm leading-6 text-muted ring-1 ring-line">
          Example profiles in this division are not real people. A review you post is saved without your name.
        </p>
      ) : null}

      {managers.length === 0 ? (
        <div className="rounded-[22px] bg-white px-6 py-12 text-center shadow-[0_10px_30px_rgba(0,19,29,0.05)] ring-1 ring-black/[0.04]">
          <p className="text-lg font-bold">
            {query ? `No managers in ${division} match “${query}”.` : `No reviews in ${division} yet.`}
          </p>
          <Link
            href="/review"
            className="mt-5 inline-block rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white"
          >
            Write a review
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {managers.map((manager) => (
            <ReviewCard key={manager.id} manager={manager} />
          ))}
        </div>
      )}
    </div>
  );
}
