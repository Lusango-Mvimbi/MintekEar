"use client";

import { previewStaff } from "@/app/actions";
import type { HrStaff } from "@/lib/access";

export function StaffSelect({ staff, current }: { staff: HrStaff[]; current: string }) {
  return (
    <form action={previewStaff} className="flex min-w-0 items-center gap-2">
      <span className="hidden text-xs font-bold tracking-wide text-muted uppercase lg:inline">HR access</span>
      <label className="sr-only" htmlFor="staff">
        Preview HR access person
      </label>
      <select
        id="staff"
        name="staff"
        defaultValue={current}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        className="max-w-[240px] rounded-full border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-accent"
      >
        {staff.map((person) => (
          <option key={person.staffId} value={person.staffId}>
            {person.displayName}
            {person.isAdmin ? " · Admin" : ""}
          </option>
        ))}
      </select>
    </form>
  );
}
