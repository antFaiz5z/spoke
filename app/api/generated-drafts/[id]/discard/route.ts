import { NextResponse } from "next/server";
import { discardGeneratedDraft } from "@/lib/server/generated-drafts";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const response = await discardGeneratedDraft(id);
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to discard generated draft";
    const status =
      message === "Generated draft not found"
        ? 404
        : message === "Saved draft cannot be discarded"
          ? 409
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
