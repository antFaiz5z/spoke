"use client";

import { useMemo, useRef, useState, type MutableRefObject } from "react";
import { useRouter } from "next/navigation";
import {
  buildPracticeNodeIndex,
  getParagraphProgressIndex,
  type PracticeNodeKey,
} from "@/lib/practice";
import { getGeneratedDraftErrorMessage } from "@/lib/generated-draft-errors";
import type { ContentItemDetailResponse } from "@/lib/types/api";
import { DraftStageSurface } from "./draft-stage-surface";
import { levelLabel, playbackModeLabel } from "../../_stage/practice-stage-controller";
import { PracticeStageFrame } from "../../_stage/practice-stage-frame";
import { MinusIcon, PlusIcon } from "../../_stage/stage-icons";
import { useStageHover } from "../../_stage/use-stage-hover";
import { usePracticeStagePlayback } from "../../_stage/use-practice-stage-playback";

type PracticeStageProps = {
  detail: ContentItemDetailResponse;
};

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

  const [generateDrawerOpen, setGenerateDrawerOpen] = useState(false);
  const [generatePrompt, setGeneratePrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [isMarkingRead, setIsMarkingRead] = useState(false);
  const [isUpdatingProgress, setIsUpdatingProgress] = useState(false);
  const [farthestParagraphIndex, setFarthestParagraphIndex] = useState(
    articleProgress.farthestParagraphIndex,
  );

  const hasMarkedReadRef = useRef(articleReadState.hasRead);
  const draftStageRef = useRef<HTMLElement | null>(null);
  const progressNodeIndex = useMemo(
    () => buildPracticeNodeIndex(structuredContent),
    [structuredContent],
  );

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

  const playback = usePracticeStagePlayback({
    structuredContent,
    onActivateNode: async (key) => {
      await ensureReadMarked();
      const nextParagraphIndex = getParagraphProgressIndex(progressNodeIndex, key);
      if (nextParagraphIndex !== null) {
        await syncProgress(nextParagraphIndex);
      }
    },
  });

  const hover = useStageHover({
    structuredContent,
    paragraphRefs: playback.paragraphRefs,
    sentenceRefs: playback.sentenceRefs,
    tokenRefs: playback.tokenRefs,
  });

  function setNodeRef(
    map: MutableRefObject<Map<string, HTMLElement>>,
    id: string,
    element: HTMLElement | null,
  ) {
    playback.setNodeRef(map, id, element);
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
      const message = error instanceof Error ? error.message : "Failed to generate draft";
      setGenerateError(getGeneratedDraftErrorMessage(message));
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <PracticeStageFrame
      headerProps={{
        headerRef: playback.headerRef,
        hidden: playback.headerHidden,
        scenarioSlug: scenario.slug,
        scenarioTitle: scenario.title,
        contentKind: contentItem.contentKind,
        difficultyLevel: contentItem.difficultyLevel,
        title: contentItem.title,
        farthestParagraphIndex,
        currentSentenceIndex: playback.currentSentenceIndex,
        sentenceCount: playback.sentenceTrack.length,
      }}
      textStageProps={{
        scrollRef: playback.textStageRef,
        visible: !generateDrawerOpen,
        structuredContent,
        hoveredKey: hover.hoveredKey,
        playingKey: playback.playingKey,
        currentSentenceKey: playback.currentSentenceKey,
        paragraphRefs: playback.paragraphRefs,
        sentenceRefs: playback.sentenceRefs,
        tokenRefs: playback.tokenRefs,
        stagePaddingTop: playback.stagePadding.paddingTop,
        stagePaddingBottom: playback.stagePadding.paddingBottom,
        onPointerMove: hover.handlePointerMove,
        onPointerLeave: hover.clearHover,
        onScroll: (scrollTop) => {
          playback.handleStageScroll(scrollTop);
          hover.scheduleLayoutRefresh();
        },
        onActivateNode: (key) => void playback.activateNode(key),
        setNodeRef,
      }}
      overlay={
        <DraftStageSurface
          scrollRef={draftStageRef}
          open={generateDrawerOpen}
          stagePaddingTop={playback.stagePadding.paddingTop}
          stagePaddingBottom={playback.stagePadding.paddingBottom}
          generatePrompt={generatePrompt}
          generateError={generateError}
          isGenerating={isGenerating}
          onScroll={(scrollTop) => {
            playback.handleStageScroll(scrollTop);
            hover.scheduleLayoutRefresh();
          }}
          onClose={() => setGenerateDrawerOpen(false)}
          onPromptChange={setGeneratePrompt}
          onGenerate={handleGenerateDraft}
        />
      }
      floatingActionButton={
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
      }
      playerProps={{
        playerRef: playback.playerRef,
        statusLabel: playback.statusLabel,
        currentLevelLabel: levelLabel(playback.playingEntry?.level ?? null),
        modeLabel: playbackModeLabel(playback.playbackMode),
        playbackMode: playback.playbackMode,
        ttsStatus: playback.ttsStatus,
        playerText: playback.playerText,
        canGoPrevSentence: playback.canGoPrevSentence,
        canGoNextSentence: playback.canGoNextSentence,
        isFirstArticle: navigation.isFirst,
        isLastArticle: navigation.isLast,
        isMarkingRead,
        isUpdatingProgress,
        voiceId: playback.voiceId,
        voiceOptions: playback.voiceOptions,
        onPrevSentence: () => playback.playSentenceByOffset(-1),
        onNextSentence: () => playback.playSentenceByOffset(1),
        onPlayPause: playback.togglePlayPause,
        onPrevArticle: () => {
          if (navigation.prevContentItemId) {
            router.push(`/practice/content-items/${navigation.prevContentItemId}`);
          }
        },
        onNextArticle: () => {
          if (navigation.nextContentItemId) {
            router.push(`/practice/content-items/${navigation.nextContentItemId}`);
          }
        },
        onCyclePlaybackMode: playback.cyclePlaybackMode,
        onVoiceChange: playback.setVoiceId,
      }}
    />
  );
}
