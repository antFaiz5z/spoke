import type { ReactNode, RefObject } from "react";
import { STAGE_SHELL_CLASS } from "./stage-layout";

type StageHeaderProps = {
  headerRef: RefObject<HTMLDivElement | null>;
  hidden: boolean;
  scenarioSlug: string;
  scenarioTitle: string;
  contentKind: string;
  difficultyLevel: string;
  title: string;
  farthestParagraphIndex: number;
  currentSentenceIndex: number;
  sentenceCount: number;
  aside?: ReactNode;
};

export function StageHeader({
  headerRef,
  hidden,
  scenarioSlug,
  scenarioTitle,
  contentKind,
  difficultyLevel,
  title,
  farthestParagraphIndex,
  currentSentenceIndex,
  sentenceCount,
  aside,
}: StageHeaderProps) {
  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition duration-300 ${
        hidden ? "pointer-events-none -translate-y-full opacity-0" : "translate-y-0 opacity-100"
      }`}
    >
      <div
        ref={headerRef}
        className="border-b border-[rgba(216,199,162,0.65)] bg-[color:rgba(255,250,240,0.92)] shadow-[0_14px_36px_rgba(60,35,10,0.08)] backdrop-blur-xl"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className={`${STAGE_SHELL_CLASS} flex flex-wrap items-end justify-between gap-5 py-4`}>
          <div className="max-w-3xl">
            <a
              href={`/scenarios/${scenarioSlug}`}
              className="text-xs uppercase tracking-[0.18em] text-[var(--paragraph)]"
            >
              Back to article catalog
            </a>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-black/50">
              <span>{scenarioTitle}</span>
              <span>·</span>
              <span>{contentKind}</span>
              <span>·</span>
              <span>{difficultyLevel}</span>
            </div>
            <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">{title}</h1>
          </div>

          <div className="self-end">
            {aside ?? (
              <div className="min-w-56 rounded-[1.25rem] border border-[var(--border)]/80 bg-white/55 px-4 py-3 text-sm text-black/65">
                <p>Resume paragraph {farthestParagraphIndex + 1}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.14em] text-black/45">
                  Sentence {currentSentenceIndex >= 0 ? currentSentenceIndex + 1 : 1} /{" "}
                  {Math.max(sentenceCount, 1)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
