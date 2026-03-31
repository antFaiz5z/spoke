"use client";

import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { useRouter } from "next/navigation";
import {
  buildPracticeNodeIndex,
  computeDistanceDrivenHover,
  createPracticeNodeKey,
  createSpeechCacheKey,
  getParagraphProgressIndex,
  setSpeechCacheEntry,
  type LayoutNodeIndex,
  type PracticeNodeKey,
  type Rect,
} from "@/lib/practice";
import {
  getNextHeaderHidden,
  getStageViewportPadding,
} from "@/lib/practice-stage";
import { getDefaultEnglishVoiceOptions } from "@/lib/tts";
import type { ContentItemDetailResponse } from "@/lib/types/api";
import { DraftStageSurface } from "./draft-stage-surface";
import { FloatingPlayer } from "./floating-player";
import {
  buildFirstSentenceByParagraphId,
  buildSentenceTrack,
  getPlaybackStatusLabel,
  levelLabel,
  playbackModeLabel,
  type PlaybackMode,
  type SentenceTrackItem,
  type TtsStatus,
} from "./practice-stage-controller";
import { MinusIcon, PlusIcon } from "./stage-icons";
import { StageHeader } from "./stage-header";
import { TextStageSurface } from "./text-stage-surface";

type PracticeStageProps = {
  detail: ContentItemDetailResponse;
};

function toRect(rect: DOMRect): Rect {
  return {
    left: rect.left,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
  };
}

function expandRect(rect: Rect, padding: number): Rect {
  return {
    left: rect.left - padding,
    top: rect.top - padding,
    right: rect.right + padding,
    bottom: rect.bottom + padding,
  };
}

export function PracticeStage({ detail }: PracticeStageProps) {
  const router = useRouter();
  const {
    scenario,
    contentItem,
    structuredContent,
    articleProgress,
    articleReadState,
    navigation,
  } = detail;

  const [hoveredKey, setHoveredKey] = useState<PracticeNodeKey | null>(null);
  const [playingKey, setPlayingKey] = useState<PracticeNodeKey | null>(null);
  const [currentSentenceKey, setCurrentSentenceKey] = useState<PracticeNodeKey | null>(null);
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>("single");
  const [voiceId, setVoiceId] = useState("English_expressive_narrator");
  const [farthestParagraphIndex, setFarthestParagraphIndex] = useState(
    articleProgress.farthestParagraphIndex,
  );
  const [ttsStatus, setTtsStatus] = useState<TtsStatus>("idle");
  const [ttsError, setTtsError] = useState<string | null>(null);
  const [generateDrawerOpen, setGenerateDrawerOpen] = useState(false);
  const [generatePrompt, setGeneratePrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [isMarkingRead, setIsMarkingRead] = useState(false);
  const [isUpdatingProgress, setIsUpdatingProgress] = useState(false);
  const [headerHidden, setHeaderHidden] = useState(false);
  const [stagePadding, setStagePadding] = useState(() =>
    getStageViewportPadding({
      headerHeight: 120,
      playerHeight: 120,
      extraTop: 12,
      extraBottom: 12,
    }),
  );

  const hasMarkedReadRef = useRef(articleReadState.hasRead);
  const lastStageScrollTopRef = useRef(0);
  const playbackModeRef = useRef<PlaybackMode>("single");
  const currentSentenceKeyRef = useRef<PracticeNodeKey | null>(null);
  const playingKeyRef = useRef<PracticeNodeKey | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<HTMLDivElement | null>(null);
  const textStageRef = useRef<HTMLElement | null>(null);
  const draftStageRef = useRef<HTMLElement | null>(null);
  const paragraphRefs = useRef<Map<string, HTMLElement>>(new Map());
  const sentenceRefs = useRef<Map<string, HTMLElement>>(new Map());
  const tokenRefs = useRef<Map<string, HTMLElement>>(new Map());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const speechCacheRef = useRef<Map<string, string>>(new Map());

  const nodeIndex = useMemo(
    () => buildPracticeNodeIndex(structuredContent),
    [structuredContent],
  );
  const voiceOptions = useMemo(() => getDefaultEnglishVoiceOptions(), []);
  const sentenceTrack = useMemo<SentenceTrackItem[]>(
    () => buildSentenceTrack(structuredContent),
    [structuredContent],
  );
  const firstSentenceByParagraphId = useMemo(
    () => buildFirstSentenceByParagraphId(structuredContent),
    [structuredContent],
  );
  const sentenceIndexByKey = useMemo(
    () => new Map(sentenceTrack.map((sentence, index) => [sentence.key, index])),
    [sentenceTrack],
  );

  function getAnchorSentenceKey(key: PracticeNodeKey): PracticeNodeKey | null {
    const entry = nodeIndex.byKey[key];
    if (!entry) {
      return null;
    }

    if (entry.level === "sentence" && entry.sentenceId) {
      return key;
    }

    if (entry.level === "token" && entry.sentenceId) {
      return createPracticeNodeKey("sentence", entry.sentenceId);
    }

    return firstSentenceByParagraphId.get(entry.paragraphId) ?? null;
  }

  async function ensureReadMarked() {
    if (hasMarkedReadRef.current || isMarkingRead) {
      return;
    }

    setIsMarkingRead(true);

    try {
      const response = await fetch(`/api/content-items/${contentItem.id}/read`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ event: "body_interaction" }),
      });

      if (response.ok) {
        hasMarkedReadRef.current = true;
      }
    } finally {
      setIsMarkingRead(false);
    }
  }

  async function syncProgress(nextParagraphIndex: number) {
    if (nextParagraphIndex <= farthestParagraphIndex || isUpdatingProgress) {
      return;
    }

    setFarthestParagraphIndex(nextParagraphIndex);
    setIsUpdatingProgress(true);

    try {
      const response = await fetch(`/api/content-items/${contentItem.id}/progress`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          farthestParagraphIndex: nextParagraphIndex,
        }),
      });

      if (!response.ok) {
        setFarthestParagraphIndex((current) => Math.min(current, nextParagraphIndex - 1));
      }
    } finally {
      setIsUpdatingProgress(false);
    }
  }

  async function playNodeAudio(key: PracticeNodeKey) {
    const entry = nodeIndex.byKey[key];
    if (!entry) {
      return;
    }

    setPlayingKey(key);
    playingKeyRef.current = key;
    setTtsStatus("loading");
    setTtsError(null);

    try {
      const cacheKey = createSpeechCacheKey(entry.text, voiceId);
      let objectUrl = speechCacheRef.current.get(cacheKey) ?? null;

      if (!objectUrl) {
        const response = await fetch("/api/audio/speech", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text: entry.text, voiceId }),
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error || "Failed to synthesize speech");
        }

        const audioBlob = await response.blob();
        objectUrl = URL.createObjectURL(audioBlob);
        const replacedUrl = setSpeechCacheEntry(speechCacheRef.current, cacheKey, objectUrl);
        if (replacedUrl) {
          URL.revokeObjectURL(replacedUrl);
        }
      }

      objectUrlRef.current = objectUrl;

      if (!audioRef.current) {
        audioRef.current = new Audio();
      }

      audioRef.current.src = objectUrl;
      await audioRef.current.play();
      setTtsStatus("playing");
    } catch (error) {
      setTtsStatus("error");
      setTtsError(error instanceof Error ? error.message : "Failed to play audio");
    }
  }

  function setPlaybackSelection(key: PracticeNodeKey) {
    const anchorSentenceKey = getAnchorSentenceKey(key);
    if (anchorSentenceKey) {
      setCurrentSentenceKey(anchorSentenceKey);
      currentSentenceKeyRef.current = anchorSentenceKey;
    }
  }

  function scrollSentenceIntoView(sentenceKey: PracticeNodeKey | null) {
    if (!sentenceKey) {
      return;
    }

    const sentenceId = sentenceKey.split(":")[1];
    const sentenceElement = sentenceRefs.current.get(sentenceId);
    sentenceElement?.scrollIntoView({
      block: "center",
      behavior: "smooth",
    });
  }

  function activateNode(key: PracticeNodeKey) {
    const entry = nodeIndex.byKey[key];
    if (!entry) {
      return;
    }

    setPlaybackSelection(key);
    void ensureReadMarked();
    void playNodeAudio(key);

    const nextParagraphIndex = getParagraphProgressIndex(nodeIndex, key);
    if (nextParagraphIndex !== null) {
      void syncProgress(nextParagraphIndex);
    }
  }

  function playSentenceByOffset(offset: -1 | 1) {
    const fallbackKey = sentenceTrack[0]?.key ?? null;
    const baseKey = currentSentenceKeyRef.current ?? fallbackKey;
    if (!baseKey) {
      return;
    }

    const currentIndex = sentenceIndexByKey.get(baseKey) ?? 0;
    const nextSentence = sentenceTrack[currentIndex + offset];
    if (!nextSentence) {
      return;
    }

    currentSentenceKeyRef.current = nextSentence.key;
    setCurrentSentenceKey(nextSentence.key);
    scrollSentenceIntoView(nextSentence.key);
    activateNode(nextSentence.key);
  }

  function togglePlayPause() {
    if (ttsStatus === "loading") {
      return;
    }

    if (ttsStatus === "playing" && audioRef.current) {
      audioRef.current.pause();
      setTtsStatus("paused");
      return;
    }

    if (ttsStatus === "paused" && audioRef.current) {
      void audioRef.current.play();
      setTtsStatus("playing");
      return;
    }

    const nextKey =
      playingKeyRef.current ?? currentSentenceKeyRef.current ?? sentenceTrack[0]?.key ?? null;
    if (nextKey) {
      activateNode(nextKey);
    }
  }

  function cyclePlaybackMode() {
    setPlaybackMode((current) => {
      if (current === "single") {
        return "repeat-one";
      }
      if (current === "repeat-one") {
        return "auto-next";
      }
      return "single";
    });
  }

  async function handleGenerateDraft() {
    if (!generatePrompt.trim()) {
      setGenerateError("Prompt is required.");
      return;
    }

    setIsGenerating(true);
    setGenerateError(null);

    try {
      const response = await fetch("/api/generated-drafts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          scenarioSlug: scenario.slug,
          prompt: generatePrompt.trim(),
          contentKind: contentItem.contentKind,
          difficultyLevel: contentItem.difficultyLevel,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || "Failed to generate draft");
      }

      const payload = (await response.json()) as { generatedDraftId: string };
      router.push(`/practice/generated-drafts/${payload.generatedDraftId}`);
      router.refresh();
    } catch (error) {
      setGenerateError(error instanceof Error ? error.message : "Failed to generate draft");
    } finally {
      setIsGenerating(false);
    }
  }

  function setNodeRef(
    map: MutableRefObject<Map<string, HTMLElement>>,
    id: string,
    element: HTMLElement | null,
  ) {
    if (element) {
      map.current.set(id, element);
      return;
    }

    map.current.delete(id);
  }

  function buildLayoutNodeIndex(): LayoutNodeIndex {
    const byKey = {} as LayoutNodeIndex["byKey"];
    const paragraphKeys: PracticeNodeKey[] = [];
    const sentenceKeys: PracticeNodeKey[] = [];
    const tokenKeys: PracticeNodeKey[] = [];

    for (const paragraph of structuredContent.paragraphs) {
      const paragraphElement = paragraphRefs.current.get(paragraph.id);
      if (!paragraphElement) {
        continue;
      }

      const paragraphKey = createPracticeNodeKey("paragraph", paragraph.id);
      const paragraphRect = toRect(paragraphElement.getBoundingClientRect());
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
        const sentenceElement = sentenceRefs.current.get(sentence.id);
        if (!sentenceElement) {
          continue;
        }

        const sentenceKey = createPracticeNodeKey("sentence", sentence.id);
        const sentenceRect = toRect(sentenceElement.getBoundingClientRect());
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

          const tokenElement = tokenRefs.current.get(token.id);
          if (!tokenElement) {
            continue;
          }

          const tokenKey = createPracticeNodeKey("token", token.id);
          const tokenRect = toRect(tokenElement.getBoundingClientRect());
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

  function handleTextStagePointerMove(event: React.MouseEvent<HTMLElement>) {
    if (!textStageRef.current) {
      return;
    }

    const layout = buildLayoutNodeIndex();
    const result = computeDistanceDrivenHover({
      pointer: {
        x: event.clientX,
        y: event.clientY,
        insideTextStage: true,
      },
      currentHoveredKey: hoveredKey,
      layout,
    });

    setHoveredKey((current) => (current === result.hoveredKey ? current : result.hoveredKey));
  }

  function handleStageScroll(scrollTop: number) {
    setHeaderHidden((previousHidden) =>
      getNextHeaderHidden({
        previousHidden,
        scrollTop,
        lastScrollTop: lastStageScrollTopRef.current,
      }),
    );
    lastStageScrollTopRef.current = scrollTop;
  }

  useEffect(() => {
    playbackModeRef.current = playbackMode;
  }, [playbackMode]);

  useEffect(() => {
    currentSentenceKeyRef.current = currentSentenceKey;
  }, [currentSentenceKey]);

  useEffect(() => {
    playingKeyRef.current = playingKey;
  }, [playingKey]);

  useEffect(() => {
    const firstSentenceKey = sentenceTrack[0]?.key ?? null;
    setCurrentSentenceKey(firstSentenceKey);
    currentSentenceKeyRef.current = firstSentenceKey;
  }, [sentenceTrack]);

  useEffect(() => {
    const audio = audioRef.current ?? new Audio();
    audioRef.current = audio;

    const handleEnded = () => {
      const currentMode = playbackModeRef.current;
      const currentKey = playingKeyRef.current;
      const anchorSentenceKey = currentSentenceKeyRef.current;

      if (currentMode === "repeat-one" && currentKey) {
        void playNodeAudio(currentKey);
        return;
      }

      if (currentMode === "auto-next" && anchorSentenceKey) {
        const currentIndex = sentenceIndexByKey.get(anchorSentenceKey) ?? -1;
        const nextSentence = sentenceTrack[currentIndex + 1];
        if (nextSentence) {
          currentSentenceKeyRef.current = nextSentence.key;
          setCurrentSentenceKey(nextSentence.key);
          scrollSentenceIntoView(nextSentence.key);
          activateNode(nextSentence.key);
          return;
        }
      }

      setTtsStatus("idle");
    };

    const handlePause = () => {
      if (audio.currentTime > 0 && !audio.ended) {
        setTtsStatus((current) => (current === "playing" ? "paused" : current));
      }
    };

    const handleError = () => {
      setTtsStatus("error");
      setTtsError("Audio playback failed.");
    };

    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("error", handleError);
    };
  }, [sentenceIndexByKey, sentenceTrack]);

  useEffect(() => {
    const updateStagePadding = () => {
      setStagePadding(
        getStageViewportPadding({
          headerHeight: headerRef.current?.offsetHeight ?? 0,
          playerHeight: playerRef.current?.offsetHeight ?? 0,
          extraTop: 12,
          extraBottom: 12,
        }),
      );
    };

    updateStagePadding();

    const observer = new ResizeObserver(updateStagePadding);
    if (headerRef.current) {
      observer.observe(headerRef.current);
    }
    if (playerRef.current) {
      observer.observe(playerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      objectUrlRef.current = null;
      for (const objectUrl of speechCacheRef.current.values()) {
        URL.revokeObjectURL(objectUrl);
      }
      speechCacheRef.current.clear();
    };
  }, []);

  const playingEntry = playingKey ? nodeIndex.byKey[playingKey] : null;
  const currentSentenceIndex =
    currentSentenceKey ? (sentenceIndexByKey.get(currentSentenceKey) ?? -1) : -1;
  const canGoPrevSentence = currentSentenceIndex > 0;
  const canGoNextSentence =
    currentSentenceIndex >= 0 && currentSentenceIndex < sentenceTrack.length - 1;
  const currentSentenceMeta =
    currentSentenceIndex >= 0 ? sentenceTrack[currentSentenceIndex] : null;
  const statusLabel = getPlaybackStatusLabel(ttsStatus, ttsError);
  const playerText =
    playingEntry?.text ??
    currentSentenceMeta?.text ??
    "Select a word, sentence, or paragraph to start practicing.";

  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <StageHeader
        headerRef={headerRef}
        hidden={headerHidden}
        scenarioSlug={scenario.slug}
        scenarioTitle={scenario.title}
        contentKind={contentItem.contentKind}
        difficultyLevel={contentItem.difficultyLevel}
        title={contentItem.title}
        farthestParagraphIndex={farthestParagraphIndex}
        currentSentenceIndex={currentSentenceIndex}
        sentenceCount={sentenceTrack.length}
      />

      <div className="fixed inset-0">
        <div className="relative h-full overflow-hidden">
          <TextStageSurface
            scrollRef={textStageRef}
            visible={!generateDrawerOpen}
            structuredContent={structuredContent}
            hoveredKey={hoveredKey}
            playingKey={playingKey}
            currentSentenceKey={currentSentenceKey}
            paragraphRefs={paragraphRefs}
            sentenceRefs={sentenceRefs}
            tokenRefs={tokenRefs}
            stagePaddingTop={stagePadding.paddingTop}
            stagePaddingBottom={stagePadding.paddingBottom}
            onPointerMove={handleTextStagePointerMove}
            onPointerLeave={() => setHoveredKey(null)}
            onScroll={handleStageScroll}
            onActivateNode={activateNode}
            setNodeRef={setNodeRef}
          />

          <DraftStageSurface
            scrollRef={draftStageRef}
            open={generateDrawerOpen}
            stagePaddingTop={stagePadding.paddingTop}
            stagePaddingBottom={stagePadding.paddingBottom}
            generatePrompt={generatePrompt}
            generateError={generateError}
            isGenerating={isGenerating}
            onScroll={handleStageScroll}
            onClose={() => setGenerateDrawerOpen(false)}
            onPromptChange={setGeneratePrompt}
            onGenerate={handleGenerateDraft}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => setGenerateDrawerOpen((open) => !open)}
        aria-label={generateDrawerOpen ? "Close draft generator" : "Open draft generator"}
        className={`fixed top-1/2 z-40 flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full border text-white shadow-[0_18px_45px_rgba(20,20,10,0.25)] transition hover:scale-[1.02] ${
          generateDrawerOpen
            ? "border-red-800/30 bg-red-600 hover:bg-red-500"
            : "border-emerald-900/25 bg-emerald-600 hover:bg-emerald-500"
        }`}
        style={{ right: "calc(env(safe-area-inset-right) + 1rem)" }}
      >
        {generateDrawerOpen ? <MinusIcon /> : <PlusIcon />}
      </button>

      <FloatingPlayer
        playerRef={playerRef}
        statusLabel={statusLabel}
        currentLevelLabel={levelLabel(playingEntry?.level ?? null)}
        modeLabel={playbackModeLabel(playbackMode)}
        playbackMode={playbackMode}
        ttsStatus={ttsStatus}
        playerText={playerText}
        canGoPrevSentence={canGoPrevSentence}
        canGoNextSentence={canGoNextSentence}
        isFirstArticle={navigation.isFirst}
        isLastArticle={navigation.isLast}
        isMarkingRead={isMarkingRead}
        isUpdatingProgress={isUpdatingProgress}
        voiceId={voiceId}
        voiceOptions={voiceOptions}
        onPrevSentence={() => playSentenceByOffset(-1)}
        onNextSentence={() => playSentenceByOffset(1)}
        onPlayPause={togglePlayPause}
        onPrevArticle={() => {
          if (navigation.prevContentItemId) {
            router.push(`/practice/content-items/${navigation.prevContentItemId}`);
          }
        }}
        onNextArticle={() => {
          if (navigation.nextContentItemId) {
            router.push(`/practice/content-items/${navigation.nextContentItemId}`);
          }
        }}
        onCyclePlaybackMode={cyclePlaybackMode}
        onVoiceChange={setVoiceId}
      />
    </main>
  );
}
