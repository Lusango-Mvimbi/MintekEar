"use client";

export function PrintButton({ className = "" }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={`rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink hover:bg-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${className}`}
    >
      Print report
    </button>
  );
}
