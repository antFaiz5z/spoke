import { NextResponse } from "next/server";
import { createGeneratedDraft } from "@/lib/server/generated-drafts";
import type { CreateGeneratedDraftRequest } from "@/lib/types/api";

export async function POST(request: Request) {
  const body = (await request.json()) as CreateGeneratedDraftRequest;

  if (!body.scenarioSlug || !body.prompt || !body.contentKind || !body.difficultyLevel) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const response = await createGeneratedDraft(body);
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create draft";
    const status = message === "Scenario not found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
