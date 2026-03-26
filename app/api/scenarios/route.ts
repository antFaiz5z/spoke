import { NextResponse } from "next/server";
import { listScenarios } from "@/lib/server/scenarios";

export async function GET() {
  const items = await listScenarios();
  return NextResponse.json({ items });
}
