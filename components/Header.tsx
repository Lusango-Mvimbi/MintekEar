import Link from "next/link";
import { DivisionSelect } from "@/components/DivisionSelect";
import { StaffSelect } from "@/components/StaffSelect";
import { listHrStaff } from "@/lib/access";
import { company } from "@/lib/company";
import { getViewer } from "@/lib/directory";
import { DIVISIONS, divisionName } from "@/lib/divisions";

export async function Header() {
  const viewer = await getViewer();
  const divisionLabel = viewer.divisionId ? divisionName(viewer.divisionId) : "Directory";
  const hrStaff = viewer.source === "preview" && viewer.hrDivision ? listHrStaff() : [];

  return (
    <header className="border-b border-line/80 bg-white print:hidden">
      <div className="mx-auto flex w-full max-w-[1040px] flex-wrap items-center justify-between gap-4 px-4 py-4">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <img src={company.logo} alt="" className="h-12 w-auto" />
          <span className="min-w-0">
            <span className="block truncate text-lg font-bold tracking-tight text-ink">{company.appName}</span>
            <span className="block truncate text-xs text-muted">
              {divisionLabel}
              {viewer.staffLabel ? ` · ${viewer.staffLabel}` : ""}
            </span>
          </span>
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {viewer.source === "preview" && viewer.divisionId ? (
            <DivisionSelect divisions={DIVISIONS} current={viewer.divisionId} />
          ) : null}
          {viewer.source === "preview" && viewer.hrDivision && viewer.staffId ? (
            <StaffSelect staff={hrStaff} current={viewer.staffId} />
          ) : null}
          {viewer.canViewAnalysis ? (
            <Link href="/report" className="rounded-full px-3 py-2 text-sm font-semibold text-accent">
              Analysis
            </Link>
          ) : null}
          {viewer.isAdmin ? (
            <Link href="/admin" className="rounded-full px-3 py-2 text-sm font-semibold text-accent">
              Access
            </Link>
          ) : null}
          <Link
            href="/review"
            className="shrink-0 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            Write a review
          </Link>
        </div>
      </div>
    </header>
  );
}
