import Link from "next/link";
import { DivisionSelect } from "@/components/DivisionSelect";
import { company } from "@/lib/company";
import { getViewer } from "@/lib/directory";
import { DIVISIONS, divisionName } from "@/lib/divisions";
import { personaHeadline } from "@/lib/persona";

export async function Header() {
  const viewer = await getViewer();
  const divisionLabel = viewer.divisionId ? divisionName(viewer.divisionId) : "Directory";
  const role = viewer.source === "preview" ? personaHeadline(viewer) : null;

  return (
    <header className="border-b border-line/80 bg-white print:hidden">
      <div className="mx-auto flex w-full min-w-0 max-w-[1040px] flex-wrap items-center justify-between gap-3 px-4 py-4 sm:gap-4 xl:max-w-7xl 2xl:max-w-[1440px]">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <img src={company.logo} alt="" className="h-12 w-auto" />
          <span className="min-w-0">
            <span className="block truncate text-lg font-bold tracking-tight text-ink">{company.appName}</span>
            <span className="block truncate text-xs text-muted">
              {divisionLabel}
              {role ? ` · ${role}` : ""}
            </span>
          </span>
        </Link>
        <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto">
          {viewer.source === "preview" && viewer.divisionId && !viewer.hrDivision ? (
            <DivisionSelect divisions={DIVISIONS} current={viewer.divisionId} />
          ) : null}
          {viewer.source === "preview" && viewer.hrDivision ? (
            <DivisionSelect divisions={DIVISIONS} current={viewer.divisionId!} />
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
            className="shrink-0 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand max-sm:ml-auto"
          >
            Write a review
          </Link>
        </div>
      </div>
    </header>
  );
}
