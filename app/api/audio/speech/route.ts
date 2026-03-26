import { NextResponse } from "next/server";
import { synthesizeSpeech } from "@/lib/tts";
import type { SynthesizeSpeechRequest } from "@/lib/types/api";

export async function POST(request: Request) {
  const body = (await request.json()) as SynthesizeSpeechRequest;

  if (!body.text || !body.text.trim()) {
    return NextResponse.json({ error: "Text is required" }, { status: 400 });
  }

  try {
    const audioBuffer = await synthesizeSpeech({
      text: body.text.trim(),
      voiceId: body.voiceId,
    });
    const audioBytes = new Uint8Array(audioBuffer);

    return new NextResponse(audioBytes, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(audioBytes.byteLength),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to synthesize speech";
    const status = message === "TTS_API_KEY is not configured" ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
