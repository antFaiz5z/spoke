import { NextResponse } from "next/server";
import { getGeneratedDraftDetail } from "@/lib/server/generated-drafts";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const detail = await getGeneratedDraftDetail(id);

  if (!detail) {
    return NextResponse.json({ error: "Generated draft not found" }, { status: 404 });
  }

  return NextResponse.json(detail, { status: 200 });
}
