import { notFound } from "next/navigation";
import { ReviewForm } from "@/components/ReviewForm";
import { getViewer } from "@/lib/directory";
import { divisionName } from "@/lib/divisions";
import { listManagerOptions } from "@/lib/queries";

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
  return (
    <ReviewForm
      managers={managers}
      initialManagerId={manager}
      divisionName={divisionName(viewer.divisionId)}
    />
  );
}
