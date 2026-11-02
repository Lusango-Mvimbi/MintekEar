import type { Viewer } from "./directory";
import { divisionName } from "./divisions";

/** Demo viewing-as switch. Everyone who is not an administrator is a colleague. */
export type DemoPersona = "colleague" | "administrator";

export function demoPersona(viewer: Viewer): DemoPersona {
  if (viewer.isAdmin) return "administrator";
  return "colleague";
}

export function personaHeadline(viewer: Viewer): string {
  return demoPersona(viewer) === "administrator" ? "Administrator (HR)" : "Colleague";
}

export function personaSummary(viewer: Viewer): string {
  if (demoPersona(viewer) === "administrator") {
    return "Full access: comments, Analysis, Access, and download.";
  }

  const division = viewer.divisionId ? divisionName(viewer.divisionId) : "no division";
  const granted: string[] = [];
  if (viewer.canReadComments) granted.push("comments");
  if (viewer.canViewAnalysis) granted.push("Analysis");
  if (viewer.canDownloadReport) granted.push("download");
  if (granted.length === 0) {
    return `${division}: scores and traits only. Comments stay hidden.`;
  }
  return `${division}: a colleague. An administrator has granted ${granted.join(", ")}.`;
}
