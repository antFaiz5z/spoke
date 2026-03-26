"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  buildPracticeNodeIndex,
  computeDistanceDrivenHover,
  createPracticeNodeKey,
  createSpeechCacheKey,
  getPlaybackControlState,
  getParagraphProgressIndex,
  setSpeechCacheEntry,
  type LayoutNodeIndex,
  type Rect,
  type PracticeNodeKey,
} from "@/lib/practice";
import { getDefaultEnglishVoiceOptions } from "@/lib/tts";
import type { ContentItemDetailResponse } from "@/lib/types/api";
import type { HoverLevel } from "@/lib/types/runtime";

type PracticeStageProps = {
  detail: ContentItemDetailResponse;
};

function levelTone(index: number) {
  if (index === 0) {
    return "border-[var(--paragraph)]/35 bg-[var(--paragraph)]/6";
  }
  if (index % 2 === 0) {
    return "border-[var(--sentence)]/25 bg-[var(--sentence)]/5";
  }
  return "border-[var(--token)]/20 bg-[var(--token)]/5";
}

function hoverClass(level: HoverLevel) {
  if (level === "paragraph") {
    return "ring-2 ring-[var(--paragraph)]/45 bg-[var(--paragraph)]/8";
  }
  if (level === "sentence") {
    return "ring-2 ring-[var(--sentence)]/45 bg-[var(--sentence)]/10";
  }
  return "bg-[var(--token)]/15 text-black";
}

function playingClass(level: HoverLevel) {
  if (level === "paragraph") {
    return "ring-2 ring-[var(--paragraph)] bg-[var(--paragraph)]/12 shadow-[0_0_0_1px_rgba(194,65,12,0.08)]";
  }
  if (level === "sentence") {
    return "ring-2 ring-[var(--sentence)] bg-[var(--sentence)]/12";
  }
  return "bg-[var(--token)]/25 text-black";
}

function levelLabel(level: HoverLevel | null) {
  if (level === "paragraph") {
    return "Paragraph";
  }
  if (level === "sentence") {
    return "Sentence";
  }
  if (level === "token") {
    return "Word";
  }
  return "Idle";
}

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
  const { scenario, contentItem, structuredContent, articleProgress, articleReadState, navigation } =
    detail;
  const [hoveredKey, setHoveredKey] = useState<PracticeNodeKey | null>(null);
  const [playingKey, setPlayingKey] = useState<PracticeNodeKey | null>(null);
  const [voiceId, setVoiceId] = useState("English_expressive_narrator");
  const [farthestParagraphIndex, setFarthestParagraphIndex] = useState(
    articleProgress.farthestParagraphIndex,
  );
  const [ttsStatus, setTtsStatus] = useState<"idle" | "loading" | "playing" | "error">("idle");
  const [ttsError, setTtsError] = useState<string | null>(null);
  const [generateDrawerOpen, setGenerateDrawerOpen] = useState(false);
  const [generatePrompt, setGeneratePrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [isMarkingRead, setIsMarkingRead] = useState(false);
  const [isUpdatingProgress, setIsUpdatingProgress] = useState(false);
  const hasMarkedReadRef = useRef(articleReadState.hasRead);
  const textStageRef = useRef<HTMLElement | null>(null);
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

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      if (objectUrlRef.current) {
        objectUrlRef.current = null;
      }

      for (const objectUrl of speechCacheRef.current.values()) {
        URL.revokeObjectURL(objectUrl);
      }

      speechCacheRef.current.clear();
    };
  }, []);

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
    if (
      nextParagraphIndex <= farthestParagraphIndex ||
      isUpdatingProgress
    ) {
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
        const replacedUrl = setSpeechCacheEntry(
          speechCacheRef.current,
          cacheKey,
          objectUrl,
        );

        if (replacedUrl) {
          URL.revokeObjectURL(replacedUrl);
        }
      }

      objectUrlRef.current = objectUrl;

      if (!audioRef.current) {
        audioRef.current = new Audio();
        audioRef.current.onended = () => setTtsStatus("idle");
        audioRef.current.onerror = () => {
          setTtsStatus("error");
          setTtsError("Audio playback failed.");
        };
      }

      audioRef.current.src = objectUrl;
      await audioRef.current.play();
      setTtsStatus("playing");
    } catch (error) {
      setTtsStatus("error");
      setTtsError(error instanceof Error ? error.message : "Failed to play audio");
    }
  }

  function stopPlayback() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    setTtsStatus("idle");
    setTtsError(null);
  }

  function replayCurrentNode() {
    if (!playingKey) {
      return;
    }

    void playNodeAudio(playingKey);
  }

  function activateNode(key: PracticeNodeKey) {
    const entry = nodeIndex.byKey[key];

    if (!entry) {
      return;
    }

    setPlayingKey(key);
    void ensureReadMarked();
    void playNodeAudio(key);

    const nextParagraphIndex = getParagraphProgressIndex(nodeIndex, key);
    if (nextParagraphIndex !== null) {
      void syncProgress(nextParagraphIndex);
    }
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
    map: React.MutableRefObject<Map<string, HTMLElement>>,
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

  const playingEntry = playingKey ? nodeIndex.byKey[playingKey] : null;
  const playbackControls = getPlaybackControlState(playingKey, ttsStatus);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-10">
      <header className="mb-8 flex flex-col gap-4">
        <a
          href={`/scenarios/${scenario.slug}`}
          className="text-sm uppercase tracking-[0.16em] text-[var(--paragraph)]"
        >
          Back to article catalog
        </a>

        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.14em] text-black/55">
              <span>{scenario.title}</span>
              <span>·</span>
              <span>{contentItem.contentKind}</span>
              <span>·</span>
              <span>{contentItem.difficultyLevel}</span>
            </div>
            <h1 className="mt-3 text-4xl font-semibold">{contentItem.title}</h1>
            <p className="mt-3 text-sm text-black/65">
              Resume paragraph {farthestParagraphIndex + 1}
            </p>
          </div>

          <nav className="flex items-center gap-3">
            <a
              href={navigation.prevContentItemId ? `/practice/content-items/${navigation.prevContentItemId}` : "#"}
              aria-disabled={navigation.isFirst}
              className={`rounded-full border px-4 py-2 text-sm font-medium ${
                navigation.isFirst
                  ? "cursor-not-allowed border-black/10 text-black/30"
                  : "border-[var(--border)] bg-[var(--surface)] text-black/75 hover:bg-white"
              }`}
            >
              Previous
            </a>
            <a
              href={navigation.nextContentItemId ? `/practice/content-items/${navigation.nextContentItemId}` : "#"}
              aria-disabled={navigation.isLast}
              className={`rounded-full border px-4 py-2 text-sm font-medium ${
                navigation.isLast
                  ? "cursor-not-allowed border-black/10 text-black/30"
                  : "border-[var(--border)] bg-[var(--surface)] text-black/75 hover:bg-white"
              }`}
            >
              Next
            </a>
          </nav>
        </div>
      </header>

      <section
        ref={textStageRef}
        className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)]/90 p-8 shadow-[0_20px_80px_rgba(60,35,10,0.08)]"
        onMouseMove={handleTextStagePointerMove}
        onMouseLeave={() => setHoveredKey(null)}
      >
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
          {structuredContent.paragraphs.map((paragraph, index) => {
            const paragraphKey = createPracticeNodeKey("paragraph", paragraph.id);
            const paragraphStateClass =
              playingKey === paragraphKey
                ? playingClass("paragraph")
                : hoveredKey === paragraphKey
                  ? hoverClass("paragraph")
                  : "";

            return (
              <article
                key={paragraph.id}
                ref={(element) => setNodeRef(paragraphRefs, paragraph.id, element)}
                className={`rounded-[1.5rem] border p-5 transition ${levelTone(index)} ${paragraphStateClass}`}
                onClick={() => activateNode(paragraphKey)}
              >
                {paragraph.speakerLabel ? (
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--paragraph)]">
                    {paragraph.speakerLabel}
                  </p>
                ) : null}

                <div className="flex flex-wrap gap-x-2 gap-y-3 text-2xl leading-[1.8] text-black/90">
                  {paragraph.sentences.map((sentence) => {
                    const sentenceKey = createPracticeNodeKey("sentence", sentence.id);
                    const sentenceStateClass =
                      playingKey === sentenceKey
                        ? playingClass("sentence")
                        : hoveredKey === sentenceKey
                          ? hoverClass("sentence")
                          : "";

                    return (
                      <span
                        key={sentence.id}
                        ref={(element) => setNodeRef(sentenceRefs, sentence.id, element)}
                        className={`inline-flex flex-wrap items-center gap-x-2 gap-y-3 rounded-xl px-1 py-1 transition ${sentenceStateClass}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          activateNode(sentenceKey);
                        }}
                      >
                        {sentence.tokens.map((token) => {
                          const tokenKey = createPracticeNodeKey("token", token.id);
                          const tokenStateClass =
                            playingKey === tokenKey
                              ? playingClass("token")
                              : hoveredKey === tokenKey
                                ? hoverClass("token")
                                : "";

                          if (token.isPunctuation) {
                            return (
                              <span
                                key={token.id}
                                className="text-black/55"
                              >
                                {token.text}
                              </span>
                            );
                          }

                          return (
                            <button
                              key={token.id}
                              ref={(element) => setNodeRef(tokenRefs, token.id, element)}
                              type="button"
                              className={`rounded-md px-1.5 py-0.5 text-left transition ${tokenStateClass || "hover:bg-[var(--token)]/10"}`}
                              onClick={(event) => {
                                event.stopPropagation();
                                activateNode(tokenKey);
                              }}
                            >
                              {token.text}
                            </button>
                          );
                        })}
                      </span>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <div className="mt-6 rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)]/80 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--sentence)]">
              {levelLabel(playingEntry?.level ?? null)} playback
            </p>
            <p className="mt-1 text-sm text-black/65">
              {playingEntry
                ? playingEntry.text
                : "Click a paragraph, sentence, or word to play MiniMax TTS and sync reading state."}
            </p>
            <p className="mt-1 text-xs text-black/45">
              {ttsStatus === "loading" ? "Synthesizing audio..." : null}
              {ttsStatus === "playing" ? "Playing audio..." : null}
              {ttsStatus === "error" ? ttsError || "Playback failed." : null}
              {(ttsStatus === "loading" || ttsStatus === "playing" || ttsStatus === "error") &&
              (isMarkingRead || isUpdatingProgress)
                ? " · "
                : null}
              {isMarkingRead ? "Marking article as read..." : null}
              {isMarkingRead && isUpdatingProgress ? " · " : null}
              {isUpdatingProgress ? "Syncing paragraph progress..." : null}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={replayCurrentNode}
              disabled={!playbackControls.canReplay}
              className={`rounded-full border px-4 py-2 text-sm font-medium ${
                playbackControls.canReplay
                  ? "border-[var(--border)] text-black/70 hover:bg-white"
                  : "cursor-not-allowed border-black/10 text-black/30"
              }`}
            >
              Replay
            </button>
            <button
              type="button"
              onClick={stopPlayback}
              disabled={!playbackControls.canStop}
              className={`rounded-full border px-4 py-2 text-sm font-medium ${
                playbackControls.canStop
                  ? "border-[var(--border)] text-black/70 hover:bg-white"
                  : "cursor-not-allowed border-black/10 text-black/30"
              }`}
            >
              Stop
            </button>
            <label className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-black/70">
              <span className="text-xs uppercase tracking-[0.12em] text-black/45">
                Voice
              </span>
              <select
                value={voiceId}
                onChange={(event) => setVoiceId(event.target.value)}
                className="bg-transparent pr-1 outline-none"
              >
                {voiceOptions.map((voice) => (
                  <option key={voice.id} value={voice.id}>
                    {voice.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => setGenerateDrawerOpen((open) => !open)}
              className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-medium text-black/70"
            >
              {generateDrawerOpen ? "Close generator" : "Generate new practice"}
            </button>
          </div>
        </div>
      </div>

      {generateDrawerOpen ? (
        <div className="mt-6 rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)]/90 p-5">
          <div className="flex flex-col gap-3">
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--paragraph)]">
              Generate draft
            </p>
            <textarea
              value={generatePrompt}
              onChange={(event) => setGeneratePrompt(event.target.value)}
              placeholder="Describe the speaking practice you want to generate for this scenario."
              className="min-h-32 rounded-[1rem] border border-[var(--border)] bg-white/80 px-4 py-3 text-sm leading-7 outline-none"
            />
            {generateError ? <p className="text-sm text-red-700">{generateError}</p> : null}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setGenerateDrawerOpen(false)}
                className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-medium text-black/70"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGenerateDraft}
                disabled={isGenerating}
                className={`rounded-full border px-4 py-2 text-sm font-medium ${
                  isGenerating
                    ? "cursor-progress border-black/10 text-black/30"
                    : "border-[var(--border)] bg-white text-black/75 hover:bg-[var(--surface)]"
                }`}
              >
                {isGenerating ? "Generating..." : "Generate draft"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
