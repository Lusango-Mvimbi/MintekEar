import { previewPersona } from "@/app/actions";
import type { Viewer } from "@/lib/directory";
import { demoPersona, personaHeadline, personaSummary } from "@/lib/persona";

function PersonaButton({
  value,
  label,
  active,
  tone,
}: {
  value: string;
  label: string;
  active: boolean;
  tone: "employee" | "admin" | "other";
}) {
  const activeClass =
    tone === "admin"
      ? "bg-brand text-white ring-brand"
      : tone === "employee"
        ? "bg-accent text-white ring-accent"
        : "bg-ink text-white ring-ink";

  return (
    <button
      type="submit"
      name="persona"
      value={value}
      aria-pressed={active}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
        active ? activeClass : "bg-white text-ink ring-1 ring-line hover:bg-paper"
      }`}
    >
      {label}
    </button>
  );
}

export function DemoViewingAs({ viewer }: { viewer: Viewer }) {
  if (viewer.source !== "preview") return null;

  const persona = demoPersona(viewer);
  const isAdmin = persona === "hr-admin";
  const isEmployee = persona === "employee";

  return (
    <div
      className={`no-print border-b ${
        isAdmin ? "border-[#d22d20]/25 bg-[#fdecee]" : "border-[#194d5c]/20 bg-[#e8f1f3]"
      }`}
    >
      <div className="mx-auto flex w-full max-w-[1040px] flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-bold tracking-[0.14em] text-muted uppercase">Demo · viewing as</p>
          <p className="mt-0.5 text-lg font-bold tracking-tight text-ink">{personaHeadline(viewer)}</p>
          <p className="mt-0.5 text-sm leading-5 text-muted">{personaSummary(viewer)}</p>
        </div>
        <form action={previewPersona} className="flex flex-wrap items-center gap-2">
          <PersonaButton value="employee" label="Normal employee" active={isEmployee} tone="employee" />
          <PersonaButton value="hr-admin" label="HR administrator" active={isAdmin} tone="admin" />
          <PersonaButton
            value="hr-analyst"
            label="HR analyst"
            active={persona === "hr-analyst"}
            tone="other"
          />
          <PersonaButton
            value="hr-colleague"
            label="HR colleague"
            active={persona === "hr-colleague"}
            tone="other"
          />
        </form>
      </div>
    </div>
  );
}
