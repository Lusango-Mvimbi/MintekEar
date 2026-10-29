"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink"
    >
      Print report
    </button>
  );
}
