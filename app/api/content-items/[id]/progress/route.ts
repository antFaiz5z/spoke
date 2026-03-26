import { NextResponse } from "next/server";
import { updateContentItemProgress } from "@/lib/server/progress";
import type { UpdateProgressRequest } from "@/lib/types/api";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = (await request.json()) as UpdateProgressRequest;

  if (
    typeof body.farthestParagraphIndex !== "number" ||
    body.farthestParagraphIndex < 0 ||
    !Number.isInteger(body.farthestParagraphIndex)
  ) {
    return NextResponse.json(
      { error: "Invalid farthestParagraphIndex" },
      { status: 400 },
    );
  }

  const response = await updateContentItemProgress(id, body.farthestParagraphIndex);
  return NextResponse.json(response, { status: 200 });
}
