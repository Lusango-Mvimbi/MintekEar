import { ReviewForm } from "@/components/ReviewForm";
import { listManagerOptions } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata = { title: "Write a review" };

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ manager?: string | string[] }>;
}) {
  const params = await searchParams;
  const manager = typeof params.manager === "string" ? params.manager : undefined;
  const managers = listManagerOptions();
  return <ReviewForm managers={managers} initialManagerId={manager} />;
}
