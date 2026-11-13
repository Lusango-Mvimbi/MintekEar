import { notFound } from "next/navigation";
import { ReviewForm } from "@/components/ReviewForm";
import { getViewer } from "@/lib/directory";
import { listManagerOptions } from "@/lib/queries";
import { listReviewedManagerIds } from "@/lib/receipts";

export const dynamic = "force-dynamic";

export const metadata = { title: "Write a review" };

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ manager?: string | string[] }>;
}) {
  const viewer = await getViewer();
  if (!viewer.divisionId) notFound();
  const params = await searchParams;
  const manager = typeof params.manager === "string" ? params.manager : undefined;
  const managers = listManagerOptions(viewer.divisionId);
  const alreadyReviewed = viewer.staffId ? new Set(listReviewedManagerIds(viewer.staffId)) : new Set<string>();
  const available = managers.filter((item) => !alreadyReviewed.has(item.id));
  const initialStillOpen = manager && !alreadyReviewed.has(manager) ? manager : undefined;
  return (
    <ReviewForm
      managers={available}
      initialManagerId={initialStillOpen}
      alreadyReviewedCount={alreadyReviewed.size}
      divisionManagerCount={managers.length}
    />
  );
}
