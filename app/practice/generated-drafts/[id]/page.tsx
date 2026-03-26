import { notFound } from "next/navigation";
import { getGeneratedDraftDetail } from "@/lib/server/generated-drafts";
import { GeneratedDraftStage } from "./practice-stage";

export const dynamic = "force-dynamic";

export default async function PracticeGeneratedDraftPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getGeneratedDraftDetail(id);

  if (!detail) {
    notFound();
  }

  return <GeneratedDraftStage detail={detail} />;
}
