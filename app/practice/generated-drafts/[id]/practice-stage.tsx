"use client";

import { type MutableRefObject, useState } from "react";
import { useRouter } from "next/navigation";
import type { GeneratedDraftDetailResponse } from "@/lib/types/api";
import { levelLabel, playbackModeLabel } from "../../_stage/practice-stage-controller";
import { PracticeStageFrame } from "../../_stage/practice-stage-frame";
import { useStageHover } from "../../_stage/use-stage-hover";
import { usePracticeStagePlayback } from "../../_stage/use-practice-stage-playback";

type GeneratedDraftStageProps = {
  detail: GeneratedDraftDetailResponse;
};

export function GeneratedDraftStage({ detail }: GeneratedDraftStageProps) {
  const router = useRouter();
  const { scenario, generatedDraft, structuredContent } = detail;
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const playback = usePracticeStagePlayback({
    structuredContent,
  });
  const hover = useStageHover({
    structuredContent,
    paragraphRefs: playback.paragraphRefs,
    sentenceRefs: playback.sentenceRefs,
    tokenRefs: playback.tokenRefs,
  });

  async function saveDraft() {
    setIsSaving(true);
    setSaveError(null);

    try {
      const response = await fetch(`/api/generated-drafts/${generatedDraft.id}/save`, {
        method: "POST",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || "Failed to save generated draft");
      }

      const payload = (await response.json()) as { savedContentItemId: string };
      router.push(`/practice/content-items/${payload.savedContentItemId}`);
      router.refresh();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Failed to save generated draft");
    } finally {
      setIsSaving(false);
    }
  }

  function setNodeRef(
    map: MutableRefObject<Map<string, HTMLElement>>,
    id: string,
    element: HTMLElement | null,
  ) {
    playback.setNodeRef(map, id, element);
  }

  return (
    <PracticeStageFrame
      headerProps={{
        headerRef: playback.headerRef,
        hidden: playback.headerHidden,
        scenarioSlug: scenario.slug,
        scenarioTitle: scenario.title,
        contentKind: generatedDraft.contentKind,
        difficultyLevel: generatedDraft.difficultyLevel,
        title: generatedDraft.title,
        farthestParagraphIndex: 0,
        currentSentenceIndex: playback.currentSentenceIndex,
        sentenceCount: playback.sentenceTrack.length,
        aside: (
          <div className="min-w-56 rounded-[1.25rem] border border-[var(--border)]/80 bg-white/55 px-4 py-3 text-sm text-black/65">
            <p>Generated draft preview</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={saveDraft}
                disabled={isSaving}
                className={`rounded-full border px-4 py-2 text-sm font-medium ${
                  isSaving
                    ? "cursor-progress border-black/10 text-black/30"
                    : "border-[var(--border)] bg-[var(--surface)] text-black/75 hover:bg-white"
                }`}
              >
                {isSaving ? "Saving..." : "Save to scenario"}
              </button>
            </div>
            {saveError ? <p className="mt-2 text-sm text-red-700">{saveError}</p> : null}
          </div>
        ),
      }}
      textStageProps={{
        scrollRef: playback.textStageRef,
        visible: true,
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
        isFirstArticle: true,
        isLastArticle: true,
        isMarkingRead: false,
        isUpdatingProgress: false,
        voiceId: playback.voiceId,
        voiceOptions: playback.voiceOptions,
        onPrevSentence: () => playback.playSentenceByOffset(-1),
        onNextSentence: () => playback.playSentenceByOffset(1),
        onPlayPause: playback.togglePlayPause,
        onPrevArticle: () => {},
        onNextArticle: () => {},
        onCyclePlaybackMode: playback.cyclePlaybackMode,
        onVoiceChange: playback.setVoiceId,
      }}
    />
  );
}
