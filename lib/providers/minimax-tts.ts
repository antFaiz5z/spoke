import type { TtsConfig, TtsRequestBody } from "@/lib/tts";

type MiniMaxTtsResponse = {
  data?: {
    audio?: string | null;
  } | null;
  base_resp?: {
    status_code?: number;
    status_msg?: string;
  };
};

export function buildMiniMaxTtsPayload(input: TtsRequestBody, config: TtsConfig) {
  return {
    model: config.model,
    text: input.text,
    stream: false,
    language_boost: "English",
    output_format: "hex",
    voice_setting: {
      voice_id: input.voiceId || config.voiceId,
      speed: 1,
      vol: 1,
      pitch: 0,
    },
    audio_setting: {
      sample_rate: 32000,
      bitrate: 128000,
      format: "mp3",
      channel: 1,
    },
  };
}

export async function requestMiniMaxTts(input: {
  config: TtsConfig;
  body: TtsRequestBody;
}): Promise<string> {
  const response = await fetch(`${input.config.apiBaseUrl}/v1/t2a_v2`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildMiniMaxTtsPayload(input.body, input.config)),
  });

  if (!response.ok) {
    throw new Error(`TTS request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as MiniMaxTtsResponse;

  if (payload.base_resp?.status_code && payload.base_resp.status_code !== 0) {
    throw new Error(payload.base_resp.status_msg || "MiniMax TTS request failed");
  }

  const hexAudio = payload.data?.audio;
  if (!hexAudio) {
    throw new Error("MiniMax TTS response did not contain audio data");
  }

  return hexAudio;
}
