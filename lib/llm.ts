import { appEnv } from "@/lib/env";
import type { ContentKind } from "@/lib/types/content";

type ChatMessage = {
  role: "system" | "user";
  content: string;
};

type CreateDraftInput = {
  scenarioTitle: string;
  prompt: string;
  contentKind: ContentKind;
  difficultyLevel: string;
};

type OpenAiCompatibleResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    } | null;
  }>;
};

const DEFAULT_OPENAI_API_BASE_URL = "https://api.minimax.chat/v1";

export function getGenerationModelForKind(contentKind: ContentKind): string {
  if (contentKind === "dialogue") {
    return "M2-her";
  }

  return "MiniMax-M2.5";
}

export function buildGeneratedDraftMessages(input: CreateDraftInput): ChatMessage[] {
  return [
    {
      role: "system",
      content:
        "You generate concise English speaking practice materials. Output English only. No Chinese. No translations. No bilingual lines. No commentary. No markdown. No labels outside the requested content. Do not add a title or heading. Return only the practice text itself.",
    },
    {
      role: "user",
      content: [
        `Scenario: ${input.scenarioTitle}`,
        `Content kind: ${input.contentKind}`,
        `Difficulty: ${input.difficultyLevel}`,
        "Task:",
        input.prompt,
      ].join("\n"),
    },
  ];
}

export async function generateDraftText(input: CreateDraftInput): Promise<string> {
  const apiKey = appEnv.openAiApiKey;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const apiBaseUrl = appEnv.openAiApiBaseUrl || DEFAULT_OPENAI_API_BASE_URL;
  const response = await fetch(`${apiBaseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getGenerationModelForKind(input.contentKind),
      messages: buildGeneratedDraftMessages(input),
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`Generation request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as OpenAiCompatibleResponse;
  const text = payload.choices?.[0]?.message?.content?.trim();

  if (!text) {
    throw new Error("Generation response did not contain content");
  }

  return text;
}
