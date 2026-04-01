import type { MutableRefObject, RefObject } from "react";
import { createPracticeNodeKey, type PracticeNodeKey } from "@/lib/practice";
import type { StructuredContent } from "@/lib/types/content";
import { STAGE_CARD_STACK_CLASS } from "./stage-layout";
import {
  getHoverStateClass,
  getParagraphToneClass,
  getPlayingStateClass,
  STAGE_PARAGRAPH_CARD_BASE_CLASS,
  STAGE_SENTENCE_BASE_CLASS,
  STAGE_TOKEN_BASE_CLASS,
} from "./stage-visuals";

type TextStageSurfaceProps = {
  scrollRef: RefObject<HTMLElement | null>;
  visible: boolean;
  structuredContent: StructuredContent;
  hoveredKey: PracticeNodeKey | null;
  playingKey: PracticeNodeKey | null;
  currentSentenceKey: PracticeNodeKey | null;
  paragraphRefs: MutableRefObject<Map<string, HTMLElement>>;
  sentenceRefs: MutableRefObject<Map<string, HTMLElement>>;
  tokenRefs: MutableRefObject<Map<string, HTMLElement>>;
  stagePaddingTop: number;
  stagePaddingBottom: number;
  onPointerMove: (event: React.MouseEvent<HTMLElement>) => void;
  onPointerLeave: () => void;
  onScroll: (scrollTop: number) => void;
  onActivateNode: (key: PracticeNodeKey) => void;
  setNodeRef: (
    map: MutableRefObject<Map<string, HTMLElement>>,
    id: string,
    element: HTMLElement | null,
  ) => void;
};

export function TextStageSurface({
  scrollRef,
  visible,
  structuredContent,
  hoveredKey,
  playingKey,
  currentSentenceKey,
  paragraphRefs,
  sentenceRefs,
  tokenRefs,
  stagePaddingTop,
  stagePaddingBottom,
  onPointerMove,
  onPointerLeave,
  onScroll,
  onActivateNode,
  setNodeRef,
}: TextStageSurfaceProps) {
  return (
    <section
      ref={scrollRef}
      className={`absolute inset-0 overflow-y-auto px-4 transition duration-400 ease-out sm:px-6 lg:px-8 ${
        visible
          ? "translate-x-0 scale-100 opacity-100"
          : "-translate-x-[14%] scale-[0.98] opacity-0 pointer-events-none"
      }`}
      style={{
        paddingTop: stagePaddingTop,
        paddingBottom: stagePaddingBottom,
        overscrollBehavior: "contain",
      }}
      onMouseMove={onPointerMove}
      onMouseLeave={onPointerLeave}
      onScroll={(event) => onScroll(event.currentTarget.scrollTop)}
    >
      <div className={STAGE_CARD_STACK_CLASS}>
        {structuredContent.paragraphs.map((paragraph, index) => {
          const paragraphKey = createPracticeNodeKey("paragraph", paragraph.id);
          const paragraphStateClass =
            playingKey === paragraphKey
              ? getPlayingStateClass("paragraph")
              : hoveredKey === paragraphKey
                ? getHoverStateClass("paragraph")
                : "";

          return (
            <article
              key={paragraph.id}
              ref={(element) => setNodeRef(paragraphRefs, paragraph.id, element)}
              className={`${STAGE_PARAGRAPH_CARD_BASE_CLASS} ${getParagraphToneClass(index)} ${paragraphStateClass}`}
              onClick={() => onActivateNode(paragraphKey)}
            >
              {paragraph.speakerLabel ? (
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--paragraph)]">
                  {paragraph.speakerLabel}
                </p>
              ) : null}

              <div className="flex flex-wrap gap-x-2 gap-y-3 text-xl leading-[1.9] text-black/90 sm:text-2xl sm:leading-[1.8]">
                {paragraph.sentences.map((sentence) => {
                  const sentenceKey = createPracticeNodeKey("sentence", sentence.id);
                  const sentenceStateClass =
                    playingKey === sentenceKey
                      ? getPlayingStateClass("sentence")
                      : hoveredKey === sentenceKey || currentSentenceKey === sentenceKey
                        ? getHoverStateClass("sentence")
                        : "";

                  return (
                    <span
                      key={sentence.id}
                      ref={(element) => setNodeRef(sentenceRefs, sentence.id, element)}
                      className={`${STAGE_SENTENCE_BASE_CLASS} ${sentenceStateClass}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        onActivateNode(sentenceKey);
                      }}
                    >
                      {sentence.tokens.map((token) => {
                        const tokenKey = createPracticeNodeKey("token", token.id);
                        const tokenStateClass =
                          playingKey === tokenKey
                            ? getPlayingStateClass("token")
                            : hoveredKey === tokenKey
                              ? getHoverStateClass("token")
                              : "";

                        if (token.isPunctuation) {
                          return (
                            <span key={token.id} className="text-black/55">
                              {token.text}
                            </span>
                          );
                        }

                        return (
                          <button
                            key={token.id}
                            ref={(element) => setNodeRef(tokenRefs, token.id, element)}
                            type="button"
                            className={`${STAGE_TOKEN_BASE_CLASS} ${tokenStateClass || "hover:bg-[var(--token)]/10"}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              onActivateNode(tokenKey);
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
  );
}
