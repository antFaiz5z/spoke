import { NextResponse } from "next/server";
import { getContentItemDetail } from "@/lib/server/content-items";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const response = await getContentItemDetail(id);

  if (!response) {
    return NextResponse.json({ error: "Content item not found" }, { status: 404 });
  }

  return NextResponse.json(response);
}
