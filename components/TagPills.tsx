import type { ReactNode } from "react";
import { displayTrait, type TraitTone } from "@/lib/tags";

type TagItem = string | { id: string; count?: number };

export type TraitChipTone = TraitTone | "action";

export function TraitChip({
  tone,
  label,
  count,
  selected = false,
  pressed,
  locked = false,
  removable = false,
  onClick,
  ariaLabel,
}: {
  tone: TraitChipTone;
  label: ReactNode;
  count?: number;
  selected?: boolean;
  pressed?: boolean;
  locked?: boolean;
  removable?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
}) {
  const className = [
    "trait-chip",
    `trait-chip--${tone}`,
    onClick ? "trait-chip--interactive" : "trait-chip--static",
    selected ? "trait-chip--on" : "",
    locked ? "trait-chip--locked" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const body = (
    <>
      <span className="trait-chip__cap" aria-hidden="true">
        <span className={`trait-mark trait-mark--${tone}`} />
      </span>
      <span className="trait-chip__label">
        {label}
        {count && count > 1 ? <span className="trait-chip__count">{count}</span> : null}
      </span>
      {removable ? (
        <span className="trait-chip__remove" aria-hidden="true">
          ×
        </span>
      ) : null}
    </>
  );

  if (!onClick) {
    return <span className={className}>{body}</span>;
  }

  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      aria-label={ariaLabel}
      {...(pressed === undefined ? {} : { "aria-pressed": pressed })}
    >
      {body}
    </button>
  );
}

export function TagPills({ tags }: { tags: readonly TagItem[] }) {
  if (tags.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {tags.map((item) => {
        const id = typeof item === "string" ? item : item.id;
        const count = typeof item === "string" ? undefined : item.count;
        const tag = displayTrait(id);
        if (!tag) return null;
        return (
          <li key={id}>
            <TraitChip tone={tag.tone} label={tag.label} count={count} />
          </li>
        );
      })}
    </ul>
  );
}
