import type { PracticeNodeKey } from "@/lib/practice";
import {
  getHoverStateClass,
  getPlayingStateClass,
} from "./stage-visuals";

type ResolveHighlightStateInput = {
  isMetaParagraph: boolean;
  hoveredKey: PracticeNodeKey | null;
  playingKey: PracticeNodeKey | null;
  currentSentenceKey?: PracticeNodeKey | null;
  targetKey: PracticeNodeKey;
  level: "paragraph" | "sentence" | "token";
};

export function resolveHighlightStateClass({
  isMetaParagraph,
  hoveredKey,
  playingKey,
  currentSentenceKey = null,
  targetKey,
  level,
}: ResolveHighlightStateInput): string {
  if (isMetaParagraph) {
    return "";
  }

  if (playingKey === targetKey) {
    return getPlayingStateClass(level);
  }

  if (hoveredKey === targetKey) {
    return getHoverStateClass(level);
  }

  if (level === "sentence" && currentSentenceKey === targetKey) {
    return getHoverStateClass("sentence");
  }

  return "";
}
