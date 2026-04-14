import type { StructuredContent } from "@/lib/types/content";
import type { HoverLevel, HoverReason } from "@/lib/types/runtime";

export type PracticeNodeKey = `${HoverLevel}:${string}`;
export type PlaybackStatus = "idle" | "loading" | "playing" | "error";

export type HoverCandidateNode = {
  key: PracticeNodeKey;
  id: string;
  level: HoverLevel;
  text: string;
  startOffset: number;
  endOffset: number;
  index: number;
  paragraphId: string;
  paragraphIndex: number;
  sentenceId: string | null;
  isPunctuation?: boolean;
};

export type HoverCandidateIndex = {
  paragraphs: HoverCandidateNode[];
  sentences: HoverCandidateNode[];
  tokens: HoverCandidateNode[];
  byKey: Record<PracticeNodeKey, HoverCandidateNode>;
};

export type PracticeNodeEntry = HoverCandidateNode & {
  speechText: string;
};

export type PracticeNodeIndex = {
  paragraphs: PracticeNodeEntry[];
  sentences: PracticeNodeEntry[];
  tokens: PracticeNodeEntry[];
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
  hoveredLevel: HoverLevel | null;
  reason: HoverReason;
  fromLevel: HoverLevel | null;
  toLevel: HoverLevel | null;
};

type BuildLayoutNodeIndexInput = {
  structuredContent: StructuredContent;
  paragraphRectsById: Map<string, Rect>;
  sentenceRectsById: Map<string, Rect>;
  tokenRectsById: Map<string, Rect>;
};

function expandRect(rect: Rect, padding: number): Rect {
  return {
    left: rect.left - padding,
    top: rect.top - padding,
    right: rect.right + padding,
    bottom: rect.bottom + padding,
  };
}

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
  const paragraphs: PracticeNodeEntry[] = [];
  const sentences: PracticeNodeEntry[] = [];
  const tokens: PracticeNodeEntry[] = [];

  for (const paragraph of structuredContent.paragraphs) {
    const paragraphKey = createPracticeNodeKey("paragraph", paragraph.id);
    const paragraphIsPlayable = paragraph.paragraphType !== "meta";
    const paragraphEntry: PracticeNodeEntry = {
      key: paragraphKey,
      id: paragraph.id,
      level: "paragraph",
      text: paragraph.text,
      startOffset: paragraph.startOffset,
      endOffset: paragraph.endOffset,
      index: paragraph.index,
      speechText: paragraphIsPlayable ? paragraph.text : "",
      paragraphId: paragraph.id,
      paragraphIndex: paragraph.index,
      sentenceId: null,
    };
    byKey[paragraphKey] = paragraphEntry;
    paragraphs.push(paragraphEntry);

    for (const sentence of paragraph.sentences) {
      const sentenceKey = createPracticeNodeKey("sentence", sentence.id);
    const sentenceEntry: PracticeNodeEntry = {
        key: sentenceKey,
        id: sentence.id,
        level: "sentence",
        text: sentence.text,
        startOffset: sentence.startOffset,
        endOffset: sentence.endOffset,
        index: sentence.index,
        speechText: paragraphIsPlayable ? sentence.text : "",
        paragraphId: paragraph.id,
        paragraphIndex: paragraph.index,
        sentenceId: sentence.id,
      };
      byKey[sentenceKey] = sentenceEntry;
      sentences.push(sentenceEntry);

      for (const token of sentence.tokens) {
        const tokenKey = createPracticeNodeKey("token", token.id);
        const tokenEntry: PracticeNodeEntry = {
          key: tokenKey,
          id: token.id,
          level: "token",
          text: token.text,
          startOffset: token.startOffset,
          endOffset: token.endOffset,
          index: token.index,
          speechText: paragraphIsPlayable ? token.text : "",
          paragraphId: paragraph.id,
          paragraphIndex: paragraph.index,
          sentenceId: sentence.id,
          isPunctuation: token.isPunctuation,
        };
        byKey[tokenKey] = tokenEntry;
        tokens.push(tokenEntry);
      }
    }
  }

  return { paragraphs, sentences, tokens, byKey };
}

export function buildHoverCandidateIndex(
  structuredContent: StructuredContent,
): HoverCandidateIndex {
  const practiceNodeIndex = buildPracticeNodeIndex(structuredContent);

  return {
    paragraphs: practiceNodeIndex.paragraphs,
    sentences: practiceNodeIndex.sentences,
    tokens: practiceNodeIndex.tokens,
    byKey: practiceNodeIndex.byKey,
  };
}

export function buildLayoutNodeIndex(input: BuildLayoutNodeIndexInput): LayoutNodeIndex {
  const { structuredContent, paragraphRectsById, sentenceRectsById, tokenRectsById } = input;
  const byKey = {} as LayoutNodeIndex["byKey"];
  const paragraphKeys: PracticeNodeKey[] = [];
  const sentenceKeys: PracticeNodeKey[] = [];
  const tokenKeys: PracticeNodeKey[] = [];

  for (const paragraph of structuredContent.paragraphs) {
    const paragraphRect = paragraphRectsById.get(paragraph.id);
    if (!paragraphRect) {
      continue;
    }

    const paragraphKey = createPracticeNodeKey("paragraph", paragraph.id);
    byKey[paragraphKey] = {
      key: paragraphKey,
      id: paragraph.id,
      level: "paragraph",
      contentRect: paragraphRect,
      hoverZoneRect: expandRect(paragraphRect, 24),
      exitZoneRect: expandRect(paragraphRect, 36),
      paragraphId: paragraph.id,
      sentenceId: null,
    };
    paragraphKeys.push(paragraphKey);

    for (const sentence of paragraph.sentences) {
      const sentenceRect = sentenceRectsById.get(sentence.id);
      if (!sentenceRect) {
        continue;
      }

      const sentenceKey = createPracticeNodeKey("sentence", sentence.id);
      byKey[sentenceKey] = {
        key: sentenceKey,
        id: sentence.id,
        level: "sentence",
        contentRect: sentenceRect,
        hoverZoneRect: expandRect(sentenceRect, 12),
        exitZoneRect: expandRect(sentenceRect, 24),
        paragraphId: paragraph.id,
        sentenceId: sentence.id,
      };
      sentenceKeys.push(sentenceKey);

      for (const token of sentence.tokens) {
        if (token.isPunctuation) {
          continue;
        }

        const tokenRect = tokenRectsById.get(token.id);
        if (!tokenRect) {
          continue;
        }

        const tokenKey = createPracticeNodeKey("token", token.id);
        byKey[tokenKey] = {
          key: tokenKey,
          id: token.id,
          level: "token",
          contentRect: tokenRect,
          hoverZoneRect: expandRect(tokenRect, 6),
          exitZoneRect: expandRect(tokenRect, 14),
          paragraphId: paragraph.id,
          sentenceId: sentence.id,
          isPunctuation: false,
        };
        tokenKeys.push(tokenKey);
      }
    }
  }

  return { byKey, paragraphKeys, sentenceKeys, tokenKeys };
}

export function buildRectMapFromElements(
  elementsById: Map<string, { getBoundingClientRect: () => Rect | DOMRect }>,
): Map<string, Rect> {
  return new Map(
    Array.from(elementsById.entries()).map(([id, element]) => {
      const rect = element.getBoundingClientRect();
      return [
        id,
        {
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
        },
      ];
    }),
  );
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
  const currentLevel = currentHoveredKey ? (layout.byKey[currentHoveredKey]?.level ?? null) : null;

  if (!pointer.insideTextStage) {
    return {
      hoveredKey: null,
      hoveredLevel: null,
      reason: "exit",
      fromLevel: currentLevel,
      toLevel: null,
    };
  }

  const current = currentHoveredKey ? layout.byKey[currentHoveredKey] : null;

  const bestToken = findBestCandidate(pointer, layout, layout.tokenKeys);
  if (bestToken) {
    if (current?.key === bestToken.key) {
      return {
        hoveredKey: bestToken.key,
        hoveredLevel: "token",
        reason: "hold",
        fromLevel: currentLevel,
        toLevel: "token",
      };
    }

    return {
      hoveredKey: bestToken.key,
      hoveredLevel: "token",
      reason: "token-hit",
      fromLevel: currentLevel,
      toLevel: "token",
    };
  }

  if (current) {
    if (pointInRect(pointer, current.exitZoneRect)) {
      return {
        hoveredKey: current.key,
        hoveredLevel: current.level,
        reason: "hold",
        fromLevel: currentLevel,
        toLevel: current.level,
      };
    }

    const fallbackNode = findAncestorFallback(pointer, current, layout);
    if (fallbackNode) {
      return {
        hoveredKey: fallbackNode.key,
        hoveredLevel: fallbackNode.level,
        reason: "fallback",
        fromLevel: currentLevel,
        toLevel: fallbackNode.level,
      };
    }
  }

  const bestSentence = findBestCandidate(pointer, layout, layout.sentenceKeys);
  if (bestSentence) {
    return {
      hoveredKey: bestSentence.key,
      hoveredLevel: "sentence",
      reason: current ? "fallback" : "sentence-hit",
      fromLevel: currentLevel,
      toLevel: "sentence",
    };
  }

  const bestParagraph = findBestCandidate(pointer, layout, layout.paragraphKeys);
  if (bestParagraph) {
    return {
      hoveredKey: bestParagraph.key,
      hoveredLevel: "paragraph",
      reason: current ? "fallback" : "paragraph-hit",
      fromLevel: currentLevel,
      toLevel: "paragraph",
    };
  }

  return {
    hoveredKey: null,
    hoveredLevel: null,
    reason: "exit",
    fromLevel: currentLevel,
    toLevel: null,
  };
}
