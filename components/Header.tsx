import Link from "next/link";
import { company } from "@/lib/company";

export function Header() {
  return (
    <header className="border-b border-line/80 bg-white">
      <div className="mx-auto flex w-full max-w-[1040px] items-center justify-between gap-4 px-4 py-4">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <img src={company.logo} alt="" className="h-12 w-auto" />
          <span className="min-w-0">
            <span className="block truncate text-lg font-bold tracking-tight text-ink">{company.appName}</span>
            <span className="block text-xs text-muted">Manager reviews</span>
          </span>
        </Link>
        <Link
          href="/review"
          className="shrink-0 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          Write a review
        </Link>
      </div>
    </header>
  );
}
