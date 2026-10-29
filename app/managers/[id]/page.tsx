import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { CompanyMark } from "@/components/CompanyMark";
import { ScoreBlock } from "@/components/ScoreBlock";
import { TagPills } from "@/components/TagPills";
import { getViewer } from "@/lib/directory";
import { divisionName } from "@/lib/divisions";
import { groupReviewsByYear, timeAgo } from "@/lib/format";
import { getManager } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getViewer();
  const manager = viewer.divisionId ? getManager(id, { divisionId: viewer.divisionId, hr: viewer.hr }) : null;
  return { title: manager?.name ?? "Manager" };
}

function Distribution({ ratings }: { ratings: number[] }) {
  const counts = [5, 4, 3, 2, 1].map((score) => ({
    score,
    count: ratings.filter((rating) => rating === score).length,
  }));
  const max = Math.max(1, ...counts.map((item) => item.count));
  return (
    <ul className="w-full max-w-xs space-y-1.5" aria-label="Scores">
      {counts.map((item) => (
        <li key={item.score} className="flex items-center gap-2 text-xs text-muted">
          <span className="w-3">{item.score}</span>
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper">
            <span
              className="block h-1.5 rounded-full bg-accent"
              style={{ width: `${(item.count / max) * 100}%` }}
            />
          </span>
          <span className="w-4 text-right">{item.count}</span>
        </li>
      ))}
    </ul>
  );
}

export default async function ManagerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ posted?: string }>;
}) {
  const { id } = await params;
  const { posted } = await searchParams;
  const viewer = await getViewer();
  if (!viewer.divisionId) notFound();
  const manager = getManager(id, { divisionId: viewer.divisionId, hr: viewer.hr });
  if (!manager) notFound();

  return (
    <div>
      <Link href="/" className="text-sm font-semibold text-accent">
        All managers
      </Link>

      {posted === "1" ? (
        <p className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm text-accent ring-1 ring-accent/20">
          Review posted. Your name was not stored.
        </p>
      ) : null}

      <section className="mt-4 rounded-[22px] bg-white p-6 shadow-[0_10px_30px_rgba(0,19,29,0.05)] ring-1 ring-black/[0.04] md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-start">
          <Avatar name={manager.name} size="lg" />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold tracking-tight">{manager.name}</h1>
            <p className="mt-1 text-muted">
              {manager.title}
              <span className="mx-2 text-line">·</span>
              {divisionName(manager.divisionId)}
              {manager.sample ? (
                <span className="ml-2 rounded-full bg-paper px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase">
                  Example
                </span>
              ) : null}
            </p>
            <p className="mt-3">
              <CompanyMark />
            </p>
            <p className="mt-4 text-sm text-muted">
              {manager.reviewCount} anonymous {manager.reviewCount === 1 ? "review" : "reviews"}
            </p>
          </div>
          <ScoreBlock score={manager.average} />
        </div>

        {manager.tagCounts.length > 0 ? (
          <div className="mt-6">
            <h2 className="text-sm font-bold">What people mention</h2>
            <div className="mt-2">
              <TagPills tags={manager.tagCounts} />
            </div>
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <Distribution ratings={manager.reviews.map((review) => review.rating)} />
          {manager.divisionId === viewer.divisionId ? (
            <Link
              href={`/review?manager=${manager.id}`}
              className="inline-flex justify-center rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              Write a review
            </Link>
          ) : null}
        </div>
      </section>

      <section className="mt-6 space-y-8">
        <h2 className="text-lg font-bold">Reviews</h2>
        {groupReviewsByYear(manager.reviews).map(({ year, reviews }) => (
          <div key={year} className="space-y-4">
            <h3 className="text-sm font-bold tracking-wide text-muted">{year}</h3>
            {reviews.map((review) => (
              <article
                key={review.id}
                className="rounded-[22px] bg-white p-6 shadow-[0_10px_30px_rgba(0,19,29,0.05)] ring-1 ring-black/[0.04]"
              >
                <div className="flex items-start justify-between gap-4">
                  <ScoreBlock score={review.rating} />
                  <time className="text-sm text-muted" dateTime={review.createdAt}>
                    {timeAgo(review.createdAt)}
                  </time>
                </div>
                {review.tags.length > 0 ? (
                  <div className="mt-4">
                    <TagPills tags={review.tags} />
                  </div>
                ) : null}
                <p className="mt-4 text-[15px] leading-7 whitespace-pre-wrap">{review.body}</p>
              </article>
            ))}
          </div>
        ))}
      </section>
    </div>
  );
}
