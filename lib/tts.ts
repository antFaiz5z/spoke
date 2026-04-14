import { appEnv } from "@/lib/env";
import {
  buildMiniMaxTtsPayload,
  requestMiniMaxTts,
} from "@/lib/providers/minimax-tts";
export { buildMiniMaxTtsPayload } from "@/lib/providers/minimax-tts";

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

const DEFAULT_MINIMAX_API_BASE_URL = "https://api.minimax.io";
const DEFAULT_MINIMAX_TTS_MODEL = "speech-2.8-hd";
const DEFAULT_MINIMAX_VOICE_ID = "English_expressive_narrator";
const DEFAULT_TTS_PROVIDER = "minimax";
const DEFAULT_ENGLISH_VOICE_OPTIONS: TtsVoiceOption[] = [
  { id: "English_expressive_narrator", label: "Narrator" },
  { id: "English_magnetic_voiced_man", label: "Magnetic Man" },
];

type TtsProvider = "minimax";

function getTtsProvider(): TtsProvider {
  const provider = (appEnv.ttsProvider || DEFAULT_TTS_PROVIDER).trim();

  if (provider !== "minimax") {
    throw new Error(`Unsupported TTS provider: ${provider}`);
  }

  return provider;
}

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

export function decodeHexAudio(hex: string): Buffer {
  if (!hex || hex.length % 2 !== 0 || /[^a-fA-F0-9]/.test(hex)) {
    throw new Error("Invalid hex audio payload");
  }

  return Buffer.from(hex, "hex");
}

export async function synthesizeSpeech(input: TtsRequestBody): Promise<Buffer> {
  const config = getTtsConfig();
  const provider = getTtsProvider();

  if (provider === "minimax") {
    const hexAudio = await requestMiniMaxTts({
      config,
      body: input,
    });
    return decodeHexAudio(hexAudio);
  }

  throw new Error(`Unsupported TTS provider: ${provider}`);
}
