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

type BuildGeneratedDraftMessagesOptions = {
  retryForDialogueBlocks?: boolean;
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

export function getGenerationFormatRule(contentKind: ContentKind): string {
  if (isDialogueLikeContentKind(contentKind)) {
    return "Return speaker-attributed dialogue lines only. Produce 4 to 8 turns, with one turn per paragraph. Use stable speaker labels such as Interviewer and Candidate. Keep each turn concise and natural, with 1 to 2 sentences per turn. Stop after the final turn. Do not include Situation, Goal, Task, Context, notes, or parenthetical instructions.";
  }

  return "Return only the practice text itself as full prose paragraphs. Produce 2 to 4 paragraphs with clear sentence-level flow suitable for reading practice. Do not include Situation, Goal, Task, Context, notes, or parenthetical instructions.";
}

export function buildGeneratedDraftMessages(
  input: CreateDraftInput,
  options: BuildGeneratedDraftMessagesOptions = {},
): ChatMessage[] {
  const formatRule = [
    getGenerationFormatRule(input.contentKind),
    options.retryForDialogueBlocks && isDialogueLikeContentKind(input.contentKind)
      ? "Separate every turn with a blank line. Do not collapse the whole dialogue into one paragraph."
      : null,
  ]
    .filter(Boolean)
    .join(" ");

  return [
    {
      role: "system",
      content:
        "You generate concise English speaking practice materials. Output English only. No Chinese. No translations. No bilingual lines. No commentary. No markdown. Return exactly two sections in plain text: a line starting with 'Title:' followed by a short natural title, then a blank line, then a line starting with 'Body:' followed by the practice text.",
    },
    {
      role: "user",
      content: [
        `Scenario: ${input.scenarioTitle}`,
        `Content kind: ${input.contentKind}`,
        `Difficulty: ${input.difficultyLevel}`,
        `Format rule: ${formatRule}`,
        "Task:",
        input.prompt,
      ].join("\n"),
    },
  ];
}

function isDialogueLikeContentKind(contentKind: ContentKind): boolean {
  return contentKind === "dialogue" || contentKind === "qa" || contentKind === "script";
}

export async function generateDraftText(
  input: CreateDraftInput,
  options: BuildGeneratedDraftMessagesOptions = {},
): Promise<string> {
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
      messages: buildGeneratedDraftMessages(input, options),
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
