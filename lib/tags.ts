export type TagTone = "positive" | "negative";

export type Tag = {
  id: string;
  label: string;
  tone: TagTone;
};

export const TAGS: readonly Tag[] = [
  { id: "supportive", label: "Supportive", tone: "positive" },
  { id: "clear-communicator", label: "Clear communicator", tone: "positive" },
  { id: "gives-feedback", label: "Gives feedback", tone: "positive" },
  { id: "low-ego", label: "Low ego", tone: "positive" },
  { id: "protects-team", label: "Protects the team", tone: "positive" },
  { id: "fair", label: "Fair", tone: "positive" },
  { id: "micromanages", label: "Micromanages", tone: "negative" },
  { id: "takes-credit", label: "Takes credit", tone: "negative" },
  { id: "blames-team", label: "Blames team", tone: "negative" },
  { id: "poor-communication", label: "Poor communication", tone: "negative" },
  { id: "plays-favourites", label: "Plays favourites", tone: "negative" },
  { id: "evasive", label: "Evasive", tone: "negative" },
];

const byId = new Map(TAGS.map((tag) => [tag.id, tag]));

export type TraitTone = TagTone | "custom";

export type Trait = {
  id: string;
  label: string;
  tone: TraitTone;
};

export const MAX_CUSTOM_TRAIT_LENGTH = 40;

const WORD_PATTERN = /^[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*$/u;

export type TraitParseResult =
  | { ok: true; id: string; custom: boolean }
  | { ok: false; error: string };

function collapseTraitText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function matchKey(value: string): string {
  return collapseTraitText(value)
    .toLowerCase()
    .replace(/[-'’]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const presetByKey = new Map<string, string>();
for (const tag of TAGS) {
  presetByKey.set(matchKey(tag.id), tag.id);
  presetByKey.set(matchKey(tag.label), tag.id);
}

export function tagById(id: string): Tag | undefined {
  return byId.get(id);
}

export function parseTrait(raw: string): TraitParseResult {
  const collapsed = collapseTraitText(raw);
  if (!collapsed) return { ok: false, error: "Enter a trait." };

  if (byId.has(collapsed)) return { ok: true, id: collapsed, custom: false };
  const presetId = presetByKey.get(matchKey(collapsed));
  if (presetId) return { ok: true, id: presetId, custom: false };

  const words = collapsed.split(" ");
  if (words.length > 2) return { ok: false, error: "Use at most two words." };
  if (collapsed.length > MAX_CUSTOM_TRAIT_LENGTH) return { ok: false, error: "That trait is too long." };
  if (!words.every((word) => WORD_PATTERN.test(word))) {
    return { ok: false, error: "Use letters and numbers." };
  }
  return { ok: true, id: collapsed, custom: true };
}

export function displayTrait(id: string): Trait | undefined {
  const preset = byId.get(id);
  if (preset) return preset;
  const parsed = parseTrait(id);
  if (!parsed.ok || !parsed.custom || parsed.id !== id) return undefined;
  return { id, label: id, tone: "custom" };
}

export function sortTagIds(ids: readonly string[]): string[] {
  const order = new Map(TAGS.map((tag, index) => [tag.id, index]));
  return [...ids].sort((a, b) => {
    const ai = order.get(a);
    const bi = order.get(b);
    if (ai !== undefined && bi !== undefined) return ai - bi;
    if (ai !== undefined) return -1;
    if (bi !== undefined) return 1;
    return a.localeCompare(b);
  });
}
