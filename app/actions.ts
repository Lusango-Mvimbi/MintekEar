"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getHrStaff, updateHrAccess } from "@/lib/access";
import { getViewer, previewStaffCookieName } from "@/lib/directory";
import { divisionById } from "@/lib/divisions";
import { insertReview } from "@/lib/queries";
import { validateReview, type ReviewDraft } from "@/lib/validation";

export type SubmitState = { error?: string };

function draftFromForm(formData: FormData): ReviewDraft {
  const rating = Number(formData.get("rating"));
  return {
    managerId: String(formData.get("managerId") ?? ""),
    rating: Number.isFinite(rating) ? rating : 0,
    body: String(formData.get("body") ?? ""),
    tags: formData.getAll("tags").filter((tag): tag is string => typeof tag === "string"),
    honeypot: String(formData.get("company_website") ?? ""),
  };
}

export async function submitReview(_prev: SubmitState, formData: FormData): Promise<SubmitState> {
  const viewer = await getViewer();
  if (!viewer.divisionId) {
    return { error: "Reviews open once the employee directory is connected." };
  }

  const result = validateReview(draftFromForm(formData));
  if (!result.ok) {
    if (result.spam) redirect("/");
    return { error: result.error };
  }

  let saved: { managerId: string };
  try {
    const inserted = insertReview(result.value, viewer.divisionId);
    if (!inserted.ok) return { error: inserted.error };
    saved = { managerId: inserted.managerId };
  } catch {
    return { error: "The review could not be saved. Try again." };
  }

  revalidatePath("/");
  revalidatePath("/report");
  revalidatePath(`/managers/${saved.managerId}`);
  redirect(`/managers/${saved.managerId}?posted=1`);
}

const cookieOpts = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
};

export async function previewDivision(formData: FormData) {
  if (process.env.MINTEKEAR_DIRECTORY === "employee") redirect("/");
  const id = String(formData.get("division") ?? "");
  if (!divisionById(id)) redirect("/");
  const jar = await cookies();
  jar.set("mintekear_division", id, cookieOpts);
  redirect("/");
}

export async function previewStaff(formData: FormData) {
  if (process.env.MINTEKEAR_DIRECTORY === "employee") redirect("/");
  const id = String(formData.get("staff") ?? "");
  if (!getHrStaff(id)) redirect("/");
  const jar = await cookies();
  jar.set(previewStaffCookieName(), id, cookieOpts);
  redirect("/");
}

/** One-click demo switch: normal employee or an HR access person. */
export async function previewPersona(formData: FormData) {
  if (process.env.MINTEKEAR_DIRECTORY === "employee") redirect("/");
  const persona = String(formData.get("persona") ?? "");
  const jar = await cookies();

  if (persona === "employee") {
    jar.set("mintekear_division", "pyrometallurgy", cookieOpts);
    jar.set(previewStaffCookieName(), "hr-general", cookieOpts);
    redirect("/");
  }

  const staffMap: Record<string, string> = {
    "hr-admin": "hr-admin",
    "hr-analyst": "hr-analyst",
    "hr-colleague": "hr-general",
  };
  const staffId = staffMap[persona];
  if (!staffId || !getHrStaff(staffId)) redirect("/");
  jar.set("mintekear_division", "human-resources", cookieOpts);
  jar.set(previewStaffCookieName(), staffId, cookieOpts);
  redirect("/");
}

export async function saveHrAccess(formData: FormData) {
  const viewer = await getViewer();
  if (!viewer.isAdmin) redirect("/");
  const staffId = String(formData.get("staffId") ?? "");
  const result = updateHrAccess(staffId, {
    canReadComments: formData.get("canReadComments") === "on",
    canViewAnalysis: formData.get("canViewAnalysis") === "on",
    canDownloadReport: formData.get("canDownloadReport") === "on",
  });
  if (!result.ok) redirect("/admin?error=1");
  revalidatePath("/admin");
  revalidatePath("/report");
  revalidatePath("/");
  redirect("/admin?saved=1");
}
