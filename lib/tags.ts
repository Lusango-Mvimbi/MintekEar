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

export function tagById(id: string): Tag | undefined {
  return byId.get(id);
}

export function sortTagIds(ids: readonly string[]): string[] {
  const order = new Map(TAGS.map((tag, index) => [tag.id, index]));
  return [...ids].sort((a, b) => (order.get(a) ?? 99) - (order.get(b) ?? 99));
}
