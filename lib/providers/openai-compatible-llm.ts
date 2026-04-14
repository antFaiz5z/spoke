type ChatMessage = {
  role: "system" | "user";
  content: string;
};

export type OpenAiCompatibleGenerationConfig = {
  apiBaseUrl: string;
  apiKey: string;
};

type OpenAiCompatibleResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    } | null;
  }>;
};

export function buildOpenAiCompatibleGenerationPayload(input: {
  model: string;
  messages: ChatMessage[];
  temperature: number;
}) {
  return {
    model: input.model,
    messages: input.messages,
    temperature: input.temperature,
  };
}

export async function requestOpenAiCompatibleGeneration(input: {
  config: OpenAiCompatibleGenerationConfig;
  model: string;
  messages: ChatMessage[];
  temperature: number;
}): Promise<string> {
  const response = await fetch(`${input.config.apiBaseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(
      buildOpenAiCompatibleGenerationPayload({
        model: input.model,
        messages: input.messages,
        temperature: input.temperature,
      }),
    ),
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
