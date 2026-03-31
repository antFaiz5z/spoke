import type { RefObject } from "react";
import { MarqueeText, PauseIcon, PlayIcon, StepIcon, TrackModeIcon } from "./stage-icons";
import { FLOATING_PLAYER_SHELL_CLASS } from "./stage-layout";

type PlaybackMode = "single" | "repeat-one" | "auto-next";
type TtsStatus = "idle" | "loading" | "playing" | "paused" | "error";

type FloatingPlayerProps = {
  playerRef: RefObject<HTMLDivElement | null>;
  statusLabel: string;
  currentLevelLabel: string;
  modeLabel: string;
  playbackMode: PlaybackMode;
  ttsStatus: TtsStatus;
  playerText: string;
  canGoPrevSentence: boolean;
  canGoNextSentence: boolean;
  isFirstArticle: boolean;
  isLastArticle: boolean;
  isMarkingRead: boolean;
  isUpdatingProgress: boolean;
  voiceId: string;
  voiceOptions: Array<{ id: string; label: string }>;
  onPrevSentence: () => void;
  onNextSentence: () => void;
  onPlayPause: () => void;
  onPrevArticle: () => void;
  onNextArticle: () => void;
  onCyclePlaybackMode: () => void;
  onVoiceChange: (value: string) => void;
};

export function FloatingPlayer({
  playerRef,
  statusLabel,
  currentLevelLabel,
  modeLabel,
  playbackMode,
  ttsStatus,
  playerText,
  canGoPrevSentence,
  canGoNextSentence,
  isFirstArticle,
  isLastArticle,
  isMarkingRead,
  isUpdatingProgress,
  voiceId,
  voiceOptions,
  onPrevSentence,
  onNextSentence,
  onPlayPause,
  onPrevArticle,
  onNextArticle,
  onCyclePlaybackMode,
  onVoiceChange,
}: FloatingPlayerProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[color:rgba(25,20,15,0.92)] text-white shadow-[0_-20px_60px_rgba(20,16,10,0.38)] backdrop-blur-2xl">
      <div
        ref={playerRef}
        className={FLOATING_PLAYER_SHELL_CLASS}
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-white/55">
              <span>{currentLevelLabel}</span>
              <span>·</span>
              <span>{statusLabel}</span>
              <span>·</span>
              <span>{modeLabel}</span>
            </div>
            <div className="mt-2 max-w-[32rem] text-sm font-medium text-white sm:text-base">
              <MarqueeText text={playerText} animate={ttsStatus === "playing"} />
            </div>
            <p className="mt-2 text-xs text-white/45">
              {isMarkingRead ? "Marking article as read..." : null}
              {isMarkingRead && isUpdatingProgress ? " · " : null}
              {isUpdatingProgress ? "Syncing paragraph progress..." : null}
            </p>
          </div>

          <div className="flex flex-col gap-3 lg:items-end">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={onPrevSentence}
                disabled={!canGoPrevSentence}
                className={`flex h-11 w-11 items-center justify-center rounded-full border text-white transition ${
                  canGoPrevSentence
                    ? "border-white/18 bg-white/10 hover:bg-white/16"
                    : "cursor-not-allowed border-white/10 text-white/25"
                }`}
                aria-label="Previous sentence"
              >
                <StepIcon direction="prev" />
              </button>

              <button
                type="button"
                onClick={onPlayPause}
                disabled={ttsStatus === "loading"}
                className={`flex h-13 w-13 items-center justify-center rounded-full border transition ${
                  ttsStatus === "loading"
                    ? "cursor-progress border-white/10 bg-white/10 text-white/40"
                    : "border-[rgba(255,255,255,0.15)] bg-[var(--paragraph)] text-white shadow-[0_12px_30px_rgba(194,65,12,0.35)] hover:brightness-110"
                }`}
                aria-label={ttsStatus === "playing" ? "Pause" : "Play"}
              >
                {ttsStatus === "playing" ? <PauseIcon /> : <PlayIcon active />}
              </button>

              <button
                type="button"
                onClick={onNextSentence}
                disabled={!canGoNextSentence}
                className={`flex h-11 w-11 items-center justify-center rounded-full border text-white transition ${
                  canGoNextSentence
                    ? "border-white/18 bg-white/10 hover:bg-white/16"
                    : "cursor-not-allowed border-white/10 text-white/25"
                }`}
                aria-label="Next sentence"
              >
                <StepIcon direction="next" />
              </button>

              <button
                type="button"
                onClick={onPrevArticle}
                disabled={isFirstArticle}
                className={`rounded-full border px-3 py-2 text-xs font-medium uppercase tracking-[0.12em] transition sm:text-sm ${
                  isFirstArticle
                    ? "cursor-not-allowed border-white/10 text-white/25"
                    : "border-white/18 bg-white/10 text-white hover:bg-white/16"
                }`}
              >
                Prev article
              </button>

              <button
                type="button"
                onClick={onNextArticle}
                disabled={isLastArticle}
                className={`rounded-full border px-3 py-2 text-xs font-medium uppercase tracking-[0.12em] transition sm:text-sm ${
                  isLastArticle
                    ? "cursor-not-allowed border-white/10 text-white/25"
                    : "border-white/18 bg-white/10 text-white hover:bg-white/16"
                }`}
              >
                Next article
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={onCyclePlaybackMode}
                className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/10 px-3 py-2 text-xs font-medium uppercase tracking-[0.12em] text-white transition hover:bg-white/16 sm:text-sm"
              >
                <TrackModeIcon mode={playbackMode} />
                <span>{modeLabel}</span>
              </button>

              <label className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/10 px-3 py-2 text-xs text-white/85 sm:text-sm">
                <span className="uppercase tracking-[0.12em] text-white/55">Voice</span>
                <select
                  value={voiceId}
                  onChange={(event) => onVoiceChange(event.target.value)}
                  className="bg-transparent pr-1 text-white outline-none"
                >
                  {voiceOptions.map((voice) => (
                    <option key={voice.id} value={voice.id} className="text-black">
                      {voice.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
