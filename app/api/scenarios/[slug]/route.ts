import { NextResponse } from "next/server";
import { getScenarioBySlug } from "@/lib/server/scenarios";

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const scenario = await getScenarioBySlug(slug);

  if (!scenario) {
    return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
  }

  return NextResponse.json(scenario);
}
