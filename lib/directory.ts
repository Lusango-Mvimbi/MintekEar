import { cookies } from "next/headers";
import { divisionById, HR_DIVISION_ID } from "./divisions";

export type Viewer = {
  divisionId: string | null;
  hr: boolean;
  source: "preview" | "unconfigured";
};

const previewCookie = "mintekear_division";

/**
 * The employee directory is not connected yet. When its schema arrives,
 * look up the signed-in person's division here and return only that.
 * Do not return a name, staff number, email, or device, and do not pass
 * the person into the review save.
 */
export async function lookupEmployee(): Promise<Viewer> {
  return { divisionId: null, hr: false, source: "unconfigured" };
}

export async function getViewer(): Promise<Viewer> {
  if (process.env.MINTEKEAR_DIRECTORY === "employee") return lookupEmployee();

  const jar = await cookies();
  const requested = jar.get(previewCookie)?.value ?? "";
  const division = divisionById(requested) ?? divisionById("pyrometallurgy");
  const divisionId = division?.id ?? "pyrometallurgy";
  return {
    divisionId,
    hr: divisionId === HR_DIVISION_ID,
    source: "preview",
  };
}

export function previewCookieName(): string {
  return previewCookie;
}
