import { initials } from "@/lib/format";

const palette = [
  { background: "#d9f5e5", color: "#137a45" },
  { background: "#f8d6e8", color: "#a1266b" },
  { background: "#e4d9fb", color: "#5b35b0" },
  { background: "#fde0dc", color: "#c2412d" },
  { background: "#d7eef8", color: "#0f5f8a" },
  { background: "#fff1d6", color: "#9a6700" },
];

function colorsFor(name: string) {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return palette[hash % palette.length];
}

export function Avatar({ name, size = "md" }: { name: string; size?: "md" | "lg" }) {
  const colors = colorsFor(name);
  const sizing = size === "lg" ? "h-20 w-20 text-2xl" : "h-14 w-14 text-base";
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold ${sizing}`}
      style={{ background: colors.background, color: colors.color }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}
