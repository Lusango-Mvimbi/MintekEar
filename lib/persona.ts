import type { Viewer } from "./directory";

/** Demo viewing-as switch. Everyone who is not an administrator is a colleague. */
export type DemoPersona = "colleague" | "administrator";

export function demoPersona(viewer: Viewer): DemoPersona {
  if (viewer.isAdmin) return "administrator";
  return "colleague";
}

export function personaHeadline(viewer: Viewer): string {
  return demoPersona(viewer) === "administrator" ? "Administrator (HR)" : "Colleague";
}
