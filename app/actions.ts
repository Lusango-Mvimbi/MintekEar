"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getHrStaff, setHrRole, updateHrAccess, type HrRole } from "@/lib/access";
import { updateAnalysisGraphVisibility } from "@/lib/analysis-graphs";
import { getViewer, previewStaffCookieName } from "@/lib/directory";
import { divisionById } from "@/lib/divisions";
import { DEMO_ADMIN_ID, DEMO_COLLEAGUE_ID } from "@/lib/hr-seed";
import { insertReview, setReviewHidden } from "@/lib/queries";
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
    policyAccepted: formData.get("policyAccepted") === "on",
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

/** One-click demo switch: a colleague, or an administrator (HR). */
export async function previewPersona(formData: FormData) {
  if (process.env.MINTEKEAR_DIRECTORY === "employee") redirect("/");
  const persona = String(formData.get("persona") ?? "");
  const jar = await cookies();

  if (persona === "colleague") {
    jar.set("mintekear_division", "pyrometallurgy", cookieOpts);
    jar.set(previewStaffCookieName(), DEMO_COLLEAGUE_ID, cookieOpts);
    redirect("/");
  }

  if (persona === "administrator") {
    if (!getHrStaff(DEMO_ADMIN_ID)) redirect("/");
    jar.set("mintekear_division", "human-resources", cookieOpts);
    jar.set(previewStaffCookieName(), DEMO_ADMIN_ID, cookieOpts);
    redirect("/");
  }

  redirect("/");
}

export async function moderateReview(formData: FormData) {
  const viewer = await getViewer();
  if (!viewer.canReadComments) {
    return;
  }
  const reviewId = String(formData.get("reviewId") ?? "");
  const hide = String(formData.get("action") ?? "") === "hide";
  const result = setReviewHidden(reviewId, hide);
  if (!result.ok) redirect("/");
  revalidatePath("/");
  revalidatePath("/report");
  revalidatePath(`/managers/${result.managerId}`);
  redirect(`/managers/${result.managerId}`);
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

export async function saveHrRole(formData: FormData) {
  const viewer = await getViewer();
  if (!viewer.isAdmin) redirect("/");
  const staffId = String(formData.get("staffId") ?? "");
  const role = String(formData.get("role") ?? "");
  if (role !== "administrator" && role !== "colleague") redirect("/admin?error=1");
  const nextRole: HrRole = role;
  const result = setHrRole(staffId, nextRole);
  if (!result.ok) redirect(result.error === "last" ? "/admin?error=last" : "/admin?error=1");
  revalidatePath("/admin");
  revalidatePath("/report");
  revalidatePath("/");
  if (nextRole === "colleague" && viewer.staffId === staffId) redirect("/");
  redirect(`/admin?role=${nextRole}`);
}

export async function saveAnalysisGraphs(formData: FormData) {
  const viewer = await getViewer();
  if (!viewer.isAdmin) redirect("/");
  const enabled = formData
    .getAll("graphs")
    .filter((value): value is string => typeof value === "string");
  try {
    updateAnalysisGraphVisibility(enabled);
  } catch {
    redirect("/admin?error=1");
  }
  revalidatePath("/admin");
  revalidatePath("/report");
  redirect("/admin?graphs=1");
}
