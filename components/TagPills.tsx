import { displayTrait } from "@/lib/tags";

type TagItem = string | { id: string; count?: number };

export function TagPills({ tags }: { tags: readonly TagItem[] }) {
  if (tags.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-2">
      {tags.map((item) => {
        const id = typeof item === "string" ? item : item.id;
        const count = typeof item === "string" ? undefined : item.count;
        const tag = displayTrait(id);
        if (!tag) return null;
        const toneClass =
          tag.tone === "positive"
            ? "border-[#b7e4c7] bg-[#e7f6ee] text-[#0f8a4b]"
            : tag.tone === "negative"
              ? "border-[#f5c2c2] bg-[#fdecee] text-[#d64545]"
              : "border-line bg-paper text-ink";
        return (
          <li key={id}>
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${toneClass}`}
            >
              {tag.label}
              {count && count > 1 ? <span className="ml-1 opacity-70">{count}</span> : null}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
