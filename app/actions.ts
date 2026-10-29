"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { insertReview } from "@/lib/queries";
import { validateReview, type ReviewDraft } from "@/lib/validation";

export type SubmitState = { error?: string };

function draftFromForm(formData: FormData): ReviewDraft {
  const rating = Number(formData.get("rating"));
  return {
    mode: String(formData.get("mode") ?? ""),
    managerId: String(formData.get("managerId") ?? ""),
    managerName: String(formData.get("managerName") ?? ""),
    managerTitle: String(formData.get("managerTitle") ?? ""),
    rating: Number.isFinite(rating) ? rating : 0,
    body: String(formData.get("body") ?? ""),
    tags: formData.getAll("tags").filter((tag): tag is string => typeof tag === "string"),
    honeypot: String(formData.get("company_website") ?? ""),
  };
}

export async function submitReview(_prev: SubmitState, formData: FormData): Promise<SubmitState> {
  const result = validateReview(draftFromForm(formData));
  if (!result.ok) {
    if (result.spam) redirect("/");
    return { error: result.error };
  }

  let saved: { managerId: string };
  try {
    const inserted = insertReview(result.value);
    if (!inserted.ok) return { error: inserted.error };
    saved = { managerId: inserted.managerId };
  } catch (error) {
    console.error(error);
    return { error: "The review could not be saved. Try again." };
  }

  revalidatePath("/");
  revalidatePath(`/managers/${saved.managerId}`);
  redirect(`/managers/${saved.managerId}?posted=1`);
}
