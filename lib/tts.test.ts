import test from "node:test";
import assert from "node:assert/strict";
import { buildMiniMaxTtsPayload, decodeHexAudio, getDefaultEnglishVoiceOptions } from "@/lib/tts";

test("buildMiniMaxTtsPayload builds a MiniMax-compatible non-streaming mp3 request", () => {
  const payload = buildMiniMaxTtsPayload(
    { text: "Hello world" },
    {
      apiBaseUrl: "https://api.minimax.io",
      apiKey: "test-key",
      model: "speech-2.8-hd",
      voiceId: "English_expressive_narrator",
    },
  );

  assert.equal(payload.model, "speech-2.8-hd");
  assert.equal(payload.text, "Hello world");
  assert.equal(payload.stream, false);
  assert.equal(payload.output_format, "hex");
  assert.equal(payload.voice_setting.voice_id, "English_expressive_narrator");
  assert.equal(payload.audio_setting.format, "mp3");
});

test("getDefaultEnglishVoiceOptions returns a stable curated English voice set", () => {
  const voices = getDefaultEnglishVoiceOptions();
  assert.equal(voices.length, 2);
  assert.equal(voices[0]?.id, "English_expressive_narrator");
  assert.equal(voices.some((voice) => voice.id === "English_magnetic_voiced_man"), true);
});

test("decodeHexAudio decodes valid hex audio data", () => {
  const buffer = decodeHexAudio("48656c6c6f");
  assert.equal(buffer.toString("utf8"), "Hello");
});

test("decodeHexAudio rejects invalid hex payloads", () => {
  assert.throws(() => decodeHexAudio("GG"), /Invalid hex audio payload/);
  assert.throws(() => decodeHexAudio("abc"), /Invalid hex audio payload/);
});
