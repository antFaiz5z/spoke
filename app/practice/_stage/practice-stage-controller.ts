import { createPracticeNodeKey, type PracticeNodeKey } from "@/lib/practice";
import type { StructuredContent } from "@/lib/types/content";
import type { HoverLevel } from "@/lib/types/runtime";

export type PlaybackMode = "single" | "repeat-one" | "auto-next";
export type TtsStatus = "idle" | "loading" | "playing" | "paused" | "error";

export type SentenceTrackItem = {
  key: PracticeNodeKey;
  id: string;
  paragraphId: string;
  paragraphIndex: number;
  text: string;
};

export function levelLabel(level: HoverLevel | null) {
  if (level === "paragraph") {
    return "Paragraph";
  }
  if (level === "sentence") {
    return "Sentence";
  }
  if (level === "token") {
    return "Word";
  }
  return "Sentence";
}

export function playbackModeLabel(mode: PlaybackMode) {
  if (mode === "repeat-one") {
    return "Repeat one";
  }
  if (mode === "auto-next") {
    return "Auto next";
  }
  return "Single";
}

export function buildSentenceTrack(structuredContent: StructuredContent): SentenceTrackItem[] {
  return structuredContent.paragraphs.flatMap((paragraph) =>
    paragraph.sentences.map((sentence) => ({
      key: createPracticeNodeKey("sentence", sentence.id),
      id: sentence.id,
      paragraphId: paragraph.id,
      paragraphIndex: paragraph.index,
      text: sentence.text,
    })),
  );
}

export function buildFirstSentenceByParagraphId(structuredContent: StructuredContent) {
  return new Map(
    structuredContent.paragraphs
      .filter((paragraph) => paragraph.sentences[0])
      .map((paragraph) => [
        paragraph.id,
        createPracticeNodeKey("sentence", paragraph.sentences[0].id),
      ]),
  );
}

export function getPlaybackStatusLabel(
  ttsStatus: TtsStatus,
  ttsError: string | null,
): string {
  if (ttsStatus === "loading") {
    return "Synthesizing audio...";
  }
  if (ttsStatus === "playing") {
    return "Playing";
  }
  if (ttsStatus === "paused") {
    return "Paused";
  }
  if (ttsStatus === "error") {
    return ttsError ?? "Playback failed.";
  }
  return "Ready";
}
