"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import {
  buildPracticeNodeIndex,
  createPracticeNodeKey,
  createSpeechCacheKey,
  setSpeechCacheEntry,
  type PracticeNodeEntry,
  type PracticeNodeKey,
} from "@/lib/practice";
import { getNextHeaderHidden, getStageViewportPadding } from "@/lib/practice-stage";
import { getDefaultEnglishVoiceOptions } from "@/lib/tts";
import type { StructuredContent } from "@/lib/types/content";
import {
  buildFirstSentenceByParagraphId,
  buildSentenceTrack,
  getPlaybackStatusLabel,
  type PlaybackMode,
  type SentenceTrackItem,
  type TtsStatus,
} from "./practice-stage-controller";

type UsePracticeStagePlaybackInput = {
  structuredContent: StructuredContent;
  onActivateNode?: (key: PracticeNodeKey) => void | Promise<void>;
};

export function usePracticeStagePlayback({
  structuredContent,
  onActivateNode,
}: UsePracticeStagePlaybackInput) {
  const [playingKey, setPlayingKey] = useState<PracticeNodeKey | null>(null);
  const [currentSentenceKey, setCurrentSentenceKey] = useState<PracticeNodeKey | null>(null);
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>("auto-next");
  const [voiceId, setVoiceId] = useState("English_expressive_narrator");
  const [ttsStatus, setTtsStatus] = useState<TtsStatus>("idle");
  const [ttsError, setTtsError] = useState<string | null>(null);
  const [headerHidden, setHeaderHidden] = useState(false);
  const [stagePadding, setStagePadding] = useState(() =>
    getStageViewportPadding({
      headerHeight: 120,
      playerHeight: 120,
      extraTop: 12,
      extraBottom: 12,
    }),
  );

  const lastStageScrollTopRef = useRef(0);
  const playbackModeRef = useRef<PlaybackMode>("auto-next");
  const currentSentenceKeyRef = useRef<PracticeNodeKey | null>(null);
  const playingKeyRef = useRef<PracticeNodeKey | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<HTMLDivElement | null>(null);
  const textStageRef = useRef<HTMLElement | null>(null);
  const paragraphRefs = useRef<Map<string, HTMLElement>>(new Map());
  const sentenceRefs = useRef<Map<string, HTMLElement>>(new Map());
  const tokenRefs = useRef<Map<string, HTMLElement>>(new Map());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const speechCacheRef = useRef<Map<string, string>>(new Map());

  const nodeIndex = useMemo(() => buildPracticeNodeIndex(structuredContent), [structuredContent]);
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
      const cacheKey = createSpeechCacheKey(entry.speechText, voiceId);
      let objectUrl = speechCacheRef.current.get(cacheKey) ?? null;

      if (!objectUrl) {
        const response = await fetch("/api/audio/speech", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text: entry.speechText, voiceId }),
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

  async function activateNode(key: PracticeNodeKey) {
    const entry = nodeIndex.byKey[key];
    if (!entry || !entry.speechText.trim()) {
      return;
    }

    setPlaybackSelection(key);
    await onActivateNode?.(key);
    await playNodeAudio(key);
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
    void activateNode(nextSentence.key);
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
      void activateNode(nextKey);
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
          void activateNode(nextSentence.key);
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

  const playingEntry: PracticeNodeEntry | null = playingKey ? nodeIndex.byKey[playingKey] : null;
  const currentSentenceIndex =
    currentSentenceKey ? (sentenceIndexByKey.get(currentSentenceKey) ?? -1) : -1;
  const currentSentenceMeta =
    currentSentenceIndex >= 0 ? sentenceTrack[currentSentenceIndex] : null;
  const playerText =
    playingEntry?.speechText ??
    currentSentenceMeta?.text ??
    "Select a word, sentence, or paragraph to start practicing.";

  return {
    nodeIndex,
    voiceOptions,
    sentenceTrack,
    headerRef,
    playerRef,
    textStageRef,
    paragraphRefs,
    sentenceRefs,
    tokenRefs,
    setNodeRef,
    activateNode,
    playSentenceByOffset,
    togglePlayPause,
    cyclePlaybackMode,
    handleStageScroll,
    playingEntry,
    playingKey,
    currentSentenceKey,
    playbackMode,
    voiceId,
    ttsStatus,
    ttsError,
    headerHidden,
    stagePadding,
    currentSentenceIndex,
    playerText,
    statusLabel: getPlaybackStatusLabel(ttsStatus, ttsError),
    canGoPrevSentence: currentSentenceIndex > 0,
    canGoNextSentence:
      currentSentenceIndex >= 0 && currentSentenceIndex < sentenceTrack.length - 1,
    setVoiceId,
  };
}
