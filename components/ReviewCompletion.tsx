import { divisionName } from "@/lib/divisions";
import type { CompletionPerson } from "@/lib/receipts";

export function ReviewCompletion({
  people,
  cycleYear,
}: {
  people: CompletionPerson[];
  cycleYear: number;
}) {
  const posted = people.filter((person) => person.hasPosted).length;
  const outstanding = people.length - posted;

  return (
    <section className="mt-10" data-review-completion={String(cycleYear)}>
      <h2 className="text-[22px] font-bold tracking-tight">Required reviews · {cycleYear}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
        Tracks who has posted a review of a manager in their division this year. It does not link a
        person to a review text — only that they have reviewed.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-[22px] bg-white px-5 py-4 ring-1 ring-black/[0.04]">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">People</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{people.length}</p>
        </div>
        <div className="rounded-[22px] bg-white px-5 py-4 ring-1 ring-black/[0.04]">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Posted</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-[#0f8a4b]">{posted}</p>
        </div>
        <div className="rounded-[22px] bg-white px-5 py-4 ring-1 ring-black/[0.04]">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Outstanding</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-[#d64545]">{outstanding}</p>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-[22px] bg-white ring-1 ring-black/[0.04]">
        <table className="w-full text-left text-sm">
          <thead className="text-muted">
            <tr className="border-b border-line">
              <th className="px-5 py-3 font-semibold">Person</th>
              <th className="px-4 py-3 font-semibold">Division</th>
              <th className="px-4 py-3 font-semibold">Managers reviewed</th>
              <th className="px-5 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {people.map((person) => (
              <tr key={person.staffId} className="border-b border-line/80 last:border-0">
                <th className="px-5 py-3 font-semibold text-ink">{person.displayName}</th>
                <td className="px-4 py-3 text-muted">
                  {person.divisionId ? divisionName(person.divisionId) : "—"}
                </td>
                <td className="px-4 py-3 tabular-nums">
                  {person.reviewedManagerIds.length}
                  {person.requiredManagerIds.length > 0
                    ? ` of ${person.requiredManagerIds.length}`
                    : ""}
                </td>
                <td className="px-5 py-3">
                  {person.hasPosted ? (
                    <span className="rounded-full bg-[#e7f6ee] px-2.5 py-1 text-xs font-bold text-[#0f8a4b]">
                      Posted
                    </span>
                  ) : (
                    <span className="rounded-full bg-[#fdecee] px-2.5 py-1 text-xs font-bold text-[#d64545]">
                      Outstanding
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
