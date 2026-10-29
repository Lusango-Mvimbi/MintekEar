import Link from "next/link";

export default function NotFound() {
  return (
    <div className="rounded-[22px] bg-white px-8 py-12 text-center shadow-[0_10px_30px_rgba(0,19,29,0.05)] ring-1 ring-black/[0.04]">
      <h1 className="text-2xl font-bold">That page is not here</h1>
      <p className="mt-2 text-sm text-muted">The manager may have been removed, or the link is old.</p>
      <Link href="/" className="mt-6 inline-block text-sm font-semibold text-brand">
        Back to managers
      </Link>
    </div>
  );
}
