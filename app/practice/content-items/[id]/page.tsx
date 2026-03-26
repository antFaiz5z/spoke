import { notFound } from "next/navigation";
import { getContentItemDetail } from "@/lib/server/content-items";
import { PracticeStage } from "./practice-stage";

export const dynamic = "force-dynamic";

export default async function PracticeContentItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getContentItemDetail(id);

  if (!detail) {
    notFound();
  }

  return <PracticeStage detail={detail} />;
}
