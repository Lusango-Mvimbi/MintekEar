import type { Viewer } from "./directory";
import { divisionName } from "./divisions";

export type DemoPersona = "employee" | "hr-admin" | "hr-analyst" | "hr-colleague";

export function demoPersona(viewer: Viewer): DemoPersona {
  if (viewer.isAdmin) return "hr-admin";
  if (viewer.hrDivision && viewer.canViewAnalysis) return "hr-analyst";
  if (viewer.hrDivision) return "hr-colleague";
  return "employee";
}

export function personaHeadline(viewer: Viewer): string {
  switch (demoPersona(viewer)) {
    case "hr-admin":
      return "HR administrator";
    case "hr-analyst":
      return "HR analyst";
    case "hr-colleague":
      return "HR colleague (same as employee)";
    default:
      return "Normal employee";
  }
}

export function personaSummary(viewer: Viewer): string {
  const division = viewer.divisionId ? divisionName(viewer.divisionId) : "no division";
  switch (demoPersona(viewer)) {
    case "hr-admin":
      return "Full access: comments, Analysis, Access, and download.";
    case "hr-analyst":
      return "Can use Analysis and read comments if Access allows it.";
    case "hr-colleague":
      return `Same as other staff in ${division}: scores and traits only, no comments.`;
    default:
      return `${division}: scores and traits only. Comments stay hidden.`;
  }
}
