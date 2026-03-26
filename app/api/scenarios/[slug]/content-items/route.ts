import { NextResponse } from "next/server";
import { listScenarioContentItems } from "@/lib/server/scenarios";

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const response = await listScenarioContentItems(slug);

  if (!response) {
    return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
  }

  return NextResponse.json(response);
}
