"use client";

import { previewDivision } from "@/app/actions";
import type { Division } from "@/lib/divisions";

export function DivisionSelect({ divisions, current }: { divisions: readonly Division[]; current: string }) {
  return (
    <form action={previewDivision} className="flex min-w-0 items-center gap-2">
      <span className="hidden text-xs font-bold tracking-wide text-muted uppercase sm:inline">Demo preview</span>
      <label className="sr-only" htmlFor="division">
        Demo preview division
      </label>
      <select
        id="division"
        name="division"
        defaultValue={current}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        className="max-w-[220px] rounded-full border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-accent"
      >
        {divisions.map((division) => (
          <option key={division.id} value={division.id}>
            {division.name}
          </option>
        ))}
      </select>
    </form>
  );
}
