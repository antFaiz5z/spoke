import { NextResponse } from "next/server";
import { saveGeneratedDraftAsContentItem } from "@/lib/server/generated-drafts";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const response = await saveGeneratedDraftAsContentItem(id);
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save generated draft";
    const status = message === "Generated draft not found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
