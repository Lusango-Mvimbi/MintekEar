import { cookies } from "next/headers";
import { getHrStaff, grantsForStaff, type AccessGrants } from "./access";
import { divisionById, HR_DIVISION_ID } from "./divisions";

export type Viewer = AccessGrants & {
  divisionId: string | null;
  /** True when the person's home division is Human Resources. Privileges are separate. */
  hrDivision: boolean;
  source: "preview" | "unconfigured";
  /** Preview / directory staff id for access only. Never stored on a review. */
  staffId: string | null;
  staffLabel: string | null;
};

const previewDivisionCookie = "mintekear_division";
const previewStaffCookie = "mintekear_staff";

/**
 * The employee directory is not connected yet. When its schema arrives,
 * look up the signed-in person's division and staff id here.
 * Return only what access needs. Do not pass the person into the review save.
 */
export async function lookupEmployee(): Promise<Viewer> {
  return {
    divisionId: null,
    hrDivision: false,
    source: "unconfigured",
    staffId: null,
    staffLabel: null,
    canReadComments: false,
    canViewAnalysis: false,
    canDownloadReport: false,
    isAdmin: false,
  };
}

export async function getViewer(): Promise<Viewer> {
  if (process.env.MINTEKEAR_DIRECTORY === "employee") return lookupEmployee();

  const jar = await cookies();
  const requested = jar.get(previewDivisionCookie)?.value ?? "";
  const division = divisionById(requested) ?? divisionById("pyrometallurgy");
  const divisionId = division?.id ?? "pyrometallurgy";
  const hrDivision = divisionId === HR_DIVISION_ID;

  if (!hrDivision) {
    return {
      divisionId,
      hrDivision: false,
      source: "preview",
      staffId: null,
      staffLabel: null,
      ...grantsForStaff(null),
    };
  }

  const requestedStaff = jar.get(previewStaffCookie)?.value ?? "hr-general";
  const staff = getHrStaff(requestedStaff) ?? getHrStaff("hr-general");
  const staffId = staff?.staffId ?? "hr-general";
  const grants = grantsForStaff(staffId);

  return {
    divisionId,
    hrDivision: true,
    source: "preview",
    staffId,
    staffLabel: staff?.displayName ?? staffId,
    ...grants,
  };
}

export function previewCookieName(): string {
  return previewDivisionCookie;
}

export function previewStaffCookieName(): string {
  return previewStaffCookie;
}

/** Org-wide manager pages and Analysis for privileged HR only. */
export function canBrowseOrganisation(viewer: Viewer): boolean {
  return viewer.canReadComments || viewer.canViewAnalysis;
}
