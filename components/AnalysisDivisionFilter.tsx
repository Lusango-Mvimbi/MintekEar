"use client";

import { useRouter } from "next/navigation";
import type { Division } from "@/lib/divisions";

export function AnalysisDivisionFilter({
  divisions,
  current,
}: {
  divisions: readonly Division[];
  current: string;
}) {
  const router = useRouter();

  function apply(value: string) {
    router.push(value ? `/report?division=${encodeURIComponent(value)}` : "/report");
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
      <label htmlFor="analysis-division" className="text-xs font-bold tracking-wide text-muted uppercase">
        Division
      </label>
      <select
        id="analysis-division"
        name="division"
        value={current}
        onChange={(event) => apply(event.target.value)}
        className="w-full min-w-0 max-w-full rounded-full border border-line bg-white px-3 py-2 text-sm font-semibold text-ink outline-none focus:border-accent sm:w-auto sm:min-w-56 sm:max-w-xs"
      >
        <option value="">All divisions</option>
        {divisions.map((division) => (
          <option key={division.id} value={division.id}>
            {division.name}
          </option>
        ))}
      </select>
    </div>
  );
}
