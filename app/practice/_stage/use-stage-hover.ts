"use client";

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import {
  buildLayoutNodeIndex,
  buildRectMapFromElements,
  computeDistanceDrivenHover,
  type LayoutNodeIndex,
  type PracticeNodeKey,
} from "@/lib/practice";
import type { StructuredContent } from "@/lib/types/content";

type UseStageHoverInput = {
  structuredContent: StructuredContent;
  paragraphRefs: MutableRefObject<Map<string, HTMLElement>>;
  sentenceRefs: MutableRefObject<Map<string, HTMLElement>>;
  tokenRefs: MutableRefObject<Map<string, HTMLElement>>;
};

const EMPTY_LAYOUT: LayoutNodeIndex = {
  byKey: {},
  paragraphKeys: [],
  sentenceKeys: [],
  tokenKeys: [],
};

export function useStageHover({
  structuredContent,
  paragraphRefs,
  sentenceRefs,
  tokenRefs,
}: UseStageHoverInput) {
  const [hoveredKey, setHoveredKey] = useState<PracticeNodeKey | null>(null);
  const layoutRef = useRef<LayoutNodeIndex>(EMPTY_LAYOUT);
  const frameRef = useRef<number | null>(null);

  const measureLayout = useCallback(() => {
    layoutRef.current = buildLayoutNodeIndex({
      structuredContent,
      paragraphRectsById: buildRectMapFromElements(paragraphRefs.current),
      sentenceRectsById: buildRectMapFromElements(sentenceRefs.current),
      tokenRectsById: buildRectMapFromElements(tokenRefs.current),
    });
  }, [paragraphRefs, sentenceRefs, structuredContent, tokenRefs]);

  const scheduleLayoutRefresh = useCallback(() => {
    if (frameRef.current !== null) {
      return;
    }

    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null;
      measureLayout();
    });
  }, [measureLayout]);

  const handlePointerMove = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      if (layoutRef.current.paragraphKeys.length === 0) {
        measureLayout();
      }

      const result = computeDistanceDrivenHover({
        pointer: {
          x: event.clientX,
          y: event.clientY,
          insideTextStage: true,
        },
        currentHoveredKey: hoveredKey,
        layout: layoutRef.current,
      });

      setHoveredKey((current) => (current === result.hoveredKey ? current : result.hoveredKey));
    },
    [hoveredKey, measureLayout],
  );

  const clearHover = useCallback(() => {
    setHoveredKey(null);
  }, []);

  useEffect(() => {
    measureLayout();
  }, [measureLayout]);

  useEffect(() => {
    const handleResize = () => scheduleLayoutRefresh();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [scheduleLayoutRefresh]);

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  return {
    hoveredKey,
    handlePointerMove,
    clearHover,
    scheduleLayoutRefresh,
  };
}
