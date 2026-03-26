import { appEnv } from "@/lib/env";

export type TtsConfig = {
  apiBaseUrl: string;
  apiKey: string;
  model: string;
  voiceId: string;
};

export type TtsVoiceOption = {
  id: string;
  label: string;
};

export type TtsRequestBody = {
  text: string;
  voiceId?: string;
};

type MiniMaxTtsResponse = {
  data?: {
    audio?: string | null;
  } | null;
  base_resp?: {
    status_code?: number;
    status_msg?: string;
  };
};

const DEFAULT_MINIMAX_API_BASE_URL = "https://api.minimax.io";
const DEFAULT_MINIMAX_TTS_MODEL = "speech-2.8-hd";
const DEFAULT_MINIMAX_VOICE_ID = "English_expressive_narrator";
const DEFAULT_ENGLISH_VOICE_OPTIONS: TtsVoiceOption[] = [
  { id: "English_expressive_narrator", label: "Narrator" },
  { id: "English_magnetic_voiced_man", label: "Magnetic Man" },
];

export function getDefaultEnglishVoiceOptions(): TtsVoiceOption[] {
  return DEFAULT_ENGLISH_VOICE_OPTIONS;
}

export function getTtsConfig(): TtsConfig {
  const apiKey = appEnv.ttsApiKey;

  if (!apiKey) {
    throw new Error("TTS_API_KEY is not configured");
  }

  return {
    apiBaseUrl: appEnv.ttsApiBaseUrl || DEFAULT_MINIMAX_API_BASE_URL,
    apiKey,
    model: DEFAULT_MINIMAX_TTS_MODEL,
    voiceId: DEFAULT_MINIMAX_VOICE_ID,
  };
}

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

export function decodeHexAudio(hex: string): Buffer {
  if (!hex || hex.length % 2 !== 0 || /[^a-fA-F0-9]/.test(hex)) {
    throw new Error("Invalid hex audio payload");
  }

  return Buffer.from(hex, "hex");
}

export async function synthesizeSpeech(input: TtsRequestBody): Promise<Buffer> {
  const config = getTtsConfig();
  const response = await fetch(`${config.apiBaseUrl}/v1/t2a_v2`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildMiniMaxTtsPayload(input, config)),
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

  return decodeHexAudio(hexAudio);
}
