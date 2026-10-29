import Link from "next/link";
import { formatScore, timeAgo } from "@/lib/format";
import type { ManagerSummary } from "@/lib/queries";
import { Avatar } from "./Avatar";
import { CompanyMark } from "./CompanyMark";
import { ChevronIcon } from "./icons";
import { ScoreBlock } from "./ScoreBlock";
import { TagPills } from "./TagPills";

export function ReviewCard({ manager }: { manager: ManagerSummary }) {
  const scoreLabel = manager.average === null ? "no reviews yet" : `rated ${formatScore(manager.average)}`;
  return (
    <Link
      href={`/managers/${manager.id}`}
      aria-label={`Reviews of ${manager.name}, ${manager.title}, ${scoreLabel}`}
      className="grid items-center gap-5 rounded-[22px] bg-white px-5 py-5 shadow-[0_10px_30px_rgba(0,19,29,0.05)] ring-1 ring-black/[0.04] transition hover:shadow-[0_16px_40px_rgba(0,19,29,0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent md:grid-cols-[minmax(240px,1.05fr)_minmax(210px,0.9fr)_minmax(260px,1.25fr)_auto] md:gap-6 md:px-6"
    >
      <span className="flex items-center gap-4">
        <Avatar name={manager.name} />
        <span className="min-w-0">
          <span className="block text-[17px] font-bold tracking-tight text-ink">{manager.name}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-muted">
            {manager.title}
            {manager.sample ? (
              <span className="rounded-full bg-paper px-2 py-0.5 text-[10px] font-bold tracking-wide text-muted uppercase">
                Example
              </span>
            ) : null}
          </span>
          <span className="mt-2 block">
            <CompanyMark />
          </span>
        </span>
      </span>
      <span>
        <ScoreBlock score={manager.average} />
        {manager.latest && manager.latest.tags.length > 0 ? (
          <span className="mt-3 block">
            <TagPills tags={manager.latest.tags} />
          </span>
        ) : null}
      </span>
      <span>
        {manager.latest ? (
          <>
            <span className="line-clamp-4 text-[15px] leading-6 text-ink">{manager.latest.body}</span>
            <span className="mt-3 block text-sm text-muted">{timeAgo(manager.latest.createdAt)}</span>
          </>
        ) : (
          <>
            <span className="text-[15px] leading-6 text-muted">No reviews yet. Be the first to write one.</span>
            <span className="mt-3 block text-sm font-semibold text-brand">Write a review</span>
          </>
        )}
      </span>
      <span className="hidden text-muted md:block">
        <ChevronIcon />
      </span>
    </Link>
  );
}
