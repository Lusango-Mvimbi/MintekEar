import Link from "next/link";
import { ReviewCard } from "@/components/ReviewCard";
import { company } from "@/lib/company";
import { listFeed } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q : "";
  const managers = listFeed(query);
  const showingExamples = managers.some((manager) => manager.sample);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight">Manager reviews</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">{company.tagline}</p>
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

      {showingExamples ? (
        <p className="mb-4 rounded-2xl bg-white px-4 py-3 text-sm leading-6 text-muted ring-1 ring-line">
          Example profiles are on this list so you can see how a review reads. They are not real people. A review you
          post is saved, and your name is not.
        </p>
      ) : null}

      {managers.length === 0 ? (
        <div className="rounded-[22px] bg-white px-6 py-12 text-center shadow-[0_10px_30px_rgba(0,19,29,0.05)] ring-1 ring-black/[0.04]">
          <p className="text-lg font-bold">{query ? `No managers match “${query}”.` : "No reviews yet."}</p>
          <p className="mt-2 text-sm text-muted">Add a manager when you write the first review.</p>
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
