import Link from "next/link";
import { POLICY_SECTIONS, POLICY_TITLE } from "@/lib/policy";

export const metadata = { title: POLICY_TITLE };

export default function PolicyPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-sm font-semibold text-accent">
        <Link href="/">Back to managers</Link>
      </p>
      <h1 className="mt-4 text-[28px] font-bold tracking-tight">{POLICY_TITLE}</h1>
      <p className="mt-2 text-sm leading-6 text-muted">
        These rules apply to every anonymous review. They protect people who write in good faith and managers from
        abuse that is not about work.
      </p>

      <div className="mt-8 space-y-8">
        {POLICY_SECTIONS.map((section) => (
          <section key={section.title} className="rounded-[22px] bg-white p-6 ring-1 ring-black/[0.04]">
            <h2 className="text-lg font-bold">{section.title}</h2>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-ink">
              {section.points.map((point) => (
                <li key={point} className="flex gap-2">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand" aria-hidden />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
