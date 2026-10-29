import { tagById } from "@/lib/tags";

type TagItem = string | { id: string; count?: number };

export function TagPills({ tags }: { tags: readonly TagItem[] }) {
  if (tags.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-2">
      {tags.map((item) => {
        const id = typeof item === "string" ? item : item.id;
        const count = typeof item === "string" ? undefined : item.count;
        const tag = tagById(id);
        if (!tag) return null;
        const positive = tag.tone === "positive";
        return (
          <li key={id}>
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${
                positive
                  ? "border-[#b7e4c7] bg-[#e7f6ee] text-[#0f8a4b]"
                  : "border-[#f5c2c2] bg-[#fdecee] text-[#d64545]"
              }`}
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
