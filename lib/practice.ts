import type { StructuredContent } from "@/lib/types/content";
import type { HoverLevel, HoverReason } from "@/lib/types/runtime";

export type PracticeNodeKey = `${HoverLevel}:${string}`;
export type PlaybackStatus = "idle" | "loading" | "playing" | "error";

export type PracticeNodeEntry = {
  key: PracticeNodeKey;
  id: string;
  level: HoverLevel;
  text: string;
  paragraphId: string;
  paragraphIndex: number;
  sentenceId: string | null;
};

export type PracticeNodeIndex = {
  byKey: Record<PracticeNodeKey, PracticeNodeEntry>;
};

export type PointerState = {
  x: number;
  y: number;
  insideTextStage: boolean;
};

export type Rect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export type LayoutNode = {
  key: PracticeNodeKey;
  id: string;
  level: HoverLevel;
  contentRect: Rect;
  hoverZoneRect: Rect;
  exitZoneRect: Rect;
  paragraphId: string;
  sentenceId?: string | null;
  isPunctuation?: boolean;
};

export type LayoutNodeIndex = {
  byKey: Record<PracticeNodeKey, LayoutNode>;
  paragraphKeys: PracticeNodeKey[];
  sentenceKeys: PracticeNodeKey[];
  tokenKeys: PracticeNodeKey[];
};

export type HoverEngineResult = {
  hoveredKey: PracticeNodeKey | null;
  reason: HoverReason;
};

export function createSpeechCacheKey(text: string, voiceId: string): string {
  return `speech:${voiceId}:${text.trim()}`;
}

export function createTestLayoutIndex(input: {
  paragraphs: Omit<LayoutNode, "level">[];
  sentences: Omit<LayoutNode, "level">[];
  tokens: Omit<LayoutNode, "level">[];
}): LayoutNodeIndex {
  const byKey = {} as Record<PracticeNodeKey, LayoutNode>;
  const paragraphKeys: PracticeNodeKey[] = [];
  const sentenceKeys: PracticeNodeKey[] = [];
  const tokenKeys: PracticeNodeKey[] = [];

  for (const node of input.paragraphs) {
    byKey[node.key] = { ...node, level: "paragraph" };
    paragraphKeys.push(node.key);
  }

  for (const node of input.sentences) {
    byKey[node.key] = { ...node, level: "sentence" };
    sentenceKeys.push(node.key);
  }

  for (const node of input.tokens) {
    byKey[node.key] = { ...node, level: "token" };
    tokenKeys.push(node.key);
  }

  return { byKey, paragraphKeys, sentenceKeys, tokenKeys };
}

export function setSpeechCacheEntry(
  cache: Map<string, string>,
  key: string,
  objectUrl: string,
): string | null {
  const previous = cache.get(key) ?? null;
  cache.set(key, objectUrl);
  return previous;
}

export function getPlaybackControlState(
  playingKey: PracticeNodeKey | null,
  ttsStatus: PlaybackStatus,
) {
  return {
    canReplay: Boolean(playingKey),
    canStop: Boolean(playingKey) && (ttsStatus === "loading" || ttsStatus === "playing"),
  };
}

export function createPracticeNodeKey(level: HoverLevel, id: string): PracticeNodeKey {
  return `${level}:${id}`;
}

export function buildPracticeNodeIndex(
  structuredContent: StructuredContent,
): PracticeNodeIndex {
  const byKey = {} as Record<PracticeNodeKey, PracticeNodeEntry>;

  for (const paragraph of structuredContent.paragraphs) {
    const paragraphKey = createPracticeNodeKey("paragraph", paragraph.id);
    byKey[paragraphKey] = {
      key: paragraphKey,
      id: paragraph.id,
      level: "paragraph",
      text: paragraph.text,
      paragraphId: paragraph.id,
      paragraphIndex: paragraph.index,
      sentenceId: null,
    };

    for (const sentence of paragraph.sentences) {
      const sentenceKey = createPracticeNodeKey("sentence", sentence.id);
      byKey[sentenceKey] = {
        key: sentenceKey,
        id: sentence.id,
        level: "sentence",
        text: sentence.text,
        paragraphId: paragraph.id,
        paragraphIndex: paragraph.index,
        sentenceId: sentence.id,
      };

      for (const token of sentence.tokens) {
        const tokenKey = createPracticeNodeKey("token", token.id);
        byKey[tokenKey] = {
          key: tokenKey,
          id: token.id,
          level: "token",
          text: token.text,
          paragraphId: paragraph.id,
          paragraphIndex: paragraph.index,
          sentenceId: sentence.id,
        };
      }
    }
  }

  return { byKey };
}

export function getParagraphProgressIndex(
  index: PracticeNodeIndex,
  key: PracticeNodeKey | null,
): number | null {
  if (!key) {
    return null;
  }

  const entry = index.byKey[key];
  return entry ? entry.paragraphIndex : null;
}

function pointInRect(pointer: PointerState, rect: Rect): boolean {
  return (
    pointer.x >= rect.left &&
    pointer.x <= rect.right &&
    pointer.y >= rect.top &&
    pointer.y <= rect.bottom
  );
}

function rectArea(rect: Rect): number {
  return Math.max(0, rect.right - rect.left) * Math.max(0, rect.bottom - rect.top);
}

function findBestCandidate(
  pointer: PointerState,
  index: LayoutNodeIndex,
  keys: PracticeNodeKey[],
): LayoutNode | null {
  let best: LayoutNode | null = null;

  for (const key of keys) {
    const node = index.byKey[key];
    if (!node || !pointInRect(pointer, node.hoverZoneRect)) {
      continue;
    }

    if (!best || rectArea(node.hoverZoneRect) < rectArea(best.hoverZoneRect)) {
      best = node;
    }
  }

  return best;
}

function findAncestorFallback(
  pointer: PointerState,
  current: LayoutNode,
  index: LayoutNodeIndex,
): LayoutNode | null {
  if (current.level === "token" && current.sentenceId) {
    const sentenceKey = createPracticeNodeKey("sentence", current.sentenceId);
    const sentenceNode = index.byKey[sentenceKey];
    if (sentenceNode && pointInRect(pointer, sentenceNode.exitZoneRect)) {
      return sentenceNode;
    }
  }

  const paragraphKey = createPracticeNodeKey("paragraph", current.paragraphId);
  const paragraphNode = index.byKey[paragraphKey];
  if (paragraphNode && pointInRect(pointer, paragraphNode.exitZoneRect)) {
    return paragraphNode;
  }

  return null;
}

export function computeDistanceDrivenHover(input: {
  pointer: PointerState;
  currentHoveredKey: PracticeNodeKey | null;
  layout: LayoutNodeIndex;
}): HoverEngineResult {
  const { pointer, currentHoveredKey, layout } = input;

  if (!pointer.insideTextStage) {
    return { hoveredKey: null, reason: "exit" };
  }

  const current = currentHoveredKey ? layout.byKey[currentHoveredKey] : null;

  const bestToken = findBestCandidate(pointer, layout, layout.tokenKeys);
  if (bestToken) {
    if (current?.key === bestToken.key) {
      return { hoveredKey: bestToken.key, reason: "hold" };
    }

    return { hoveredKey: bestToken.key, reason: "token-hit" };
  }

  if (current) {
    if (pointInRect(pointer, current.exitZoneRect)) {
      return { hoveredKey: current.key, reason: "hold" };
    }

    const fallbackNode = findAncestorFallback(pointer, current, layout);
    if (fallbackNode) {
      return { hoveredKey: fallbackNode.key, reason: "fallback" };
    }
  }

  const bestSentence = findBestCandidate(pointer, layout, layout.sentenceKeys);
  if (bestSentence) {
    return {
      hoveredKey: bestSentence.key,
      reason: current ? "fallback" : "sentence-hit",
    };
  }

  const bestParagraph = findBestCandidate(pointer, layout, layout.paragraphKeys);
  if (bestParagraph) {
    return {
      hoveredKey: bestParagraph.key,
      reason: current ? "fallback" : "paragraph-hit",
    };
  }

  return { hoveredKey: null, reason: "exit" };
}
