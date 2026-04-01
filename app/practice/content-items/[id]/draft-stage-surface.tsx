import type { RefObject } from "react";
import { STAGE_PANEL_STACK_CLASS } from "../../_stage/stage-layout";

type DraftStageSurfaceProps = {
  scrollRef: RefObject<HTMLElement | null>;
  open: boolean;
  stagePaddingTop: number;
  stagePaddingBottom: number;
  generatePrompt: string;
  generateError: string | null;
  isGenerating: boolean;
  onScroll: (scrollTop: number) => void;
  onClose: () => void;
  onPromptChange: (value: string) => void;
  onGenerate: () => void;
};

export function DraftStageSurface({
  scrollRef,
  open,
  stagePaddingTop,
  stagePaddingBottom,
  generatePrompt,
  generateError,
  isGenerating,
  onScroll,
  onClose,
  onPromptChange,
  onGenerate,
}: DraftStageSurfaceProps) {
  return (
    <aside
      ref={scrollRef}
      className={`absolute inset-0 overflow-y-auto bg-[color:rgba(255,250,240,0.96)] px-4 shadow-[-20px_0_80px_rgba(60,35,10,0.08)] transition duration-400 ease-out sm:px-6 lg:px-8 ${
        open ? "translate-x-0 opacity-100" : "translate-x-[16%] opacity-0 pointer-events-none"
      }`}
      style={{
        paddingTop: stagePaddingTop,
        paddingBottom: stagePaddingBottom,
        overscrollBehavior: "contain",
      }}
      onScroll={(event) => onScroll(event.currentTarget.scrollTop)}
    >
      <div className={STAGE_PANEL_STACK_CLASS}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--paragraph)]">
              Generate draft
            </p>
            <h2 className="mt-2 text-2xl font-semibold">
              Replace the stage with a new practice draft
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[var(--border)] px-4 py-2 text-sm text-black/60"
          >
            Close
          </button>
        </div>

        <p className="max-w-2xl text-sm leading-7 text-black/65">
          Describe the speaking situation you want. The generated draft will keep the
          current scenario, content kind, and difficulty level, then replace this reading
          surface after creation.
        </p>

        <textarea
          value={generatePrompt}
          onChange={(event) => onPromptChange(event.target.value)}
          placeholder="Describe the speaking practice you want to generate for this scenario."
          className="min-h-48 flex-1 rounded-[1.25rem] border border-[var(--border)] bg-white/85 px-4 py-4 text-sm leading-7 outline-none"
        />
        {generateError ? <p className="text-sm text-red-700">{generateError}</p> : null}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-medium text-black/70"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onGenerate}
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
    </aside>
  );
}
