import { NextResponse } from "next/server";
import { markContentItemRead } from "@/lib/server/progress";
import type { MarkReadRequest } from "@/lib/types/api";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = (await request.json()) as MarkReadRequest;

  if (body.event !== "body_interaction") {
    return NextResponse.json({ error: "Invalid read event" }, { status: 400 });
  }

  const response = await markContentItemRead(id);
  return NextResponse.json(response, { status: 200 });
}
