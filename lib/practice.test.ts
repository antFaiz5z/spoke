import test from "node:test";
import assert from "node:assert/strict";
import {
  buildLayoutNodeIndex,
  buildPracticeNodeIndex,
  buildRectMapFromElements,
  computeDistanceDrivenHover,
  createPracticeNodeKey,
  createSpeechCacheKey,
  createTestLayoutIndex,
  getPlaybackControlState,
  getParagraphProgressIndex,
  setSpeechCacheEntry,
} from "@/lib/practice";
import type { StructuredContent } from "@/lib/types/content";

const structuredContent: StructuredContent = {
  version: 1,
  paragraphs: [
    {
      id: "p1",
      index: 0,
      speakerId: "interviewer",
      speakerLabel: "Interviewer",
      text: "Tell me about yourself.",
      startOffset: 0,
      endOffset: 24,
      sentences: [
        {
          id: "s1",
          index: 0,
          text: "Tell me about yourself.",
          startOffset: 0,
          endOffset: 24,
          tokens: [
            {
              id: "t1",
              index: 0,
              text: "Tell",
              normalizedText: "tell",
              isPunctuation: false,
              startOffset: 0,
              endOffset: 4,
            },
            {
              id: "t2",
              index: 1,
              text: ".",
              normalizedText: ".",
              isPunctuation: true,
              startOffset: 23,
              endOffset: 24,
            },
          ],
        },
      ],
    },
  ],
};

test("createPracticeNodeKey produces stable level-prefixed keys", () => {
  assert.equal(createPracticeNodeKey("paragraph", "p1"), "paragraph:p1");
  assert.equal(createPracticeNodeKey("sentence", "s1"), "sentence:s1");
  assert.equal(createPracticeNodeKey("token", "t1"), "token:t1");
});

test("buildPracticeNodeIndex flattens paragraph, sentence, and token nodes", () => {
  const index = buildPracticeNodeIndex(structuredContent);

  assert.equal(index.byKey["paragraph:p1"].text, "Tell me about yourself.");
  assert.equal(index.byKey["paragraph:p1"].speechText, "Tell me about yourself.");
  assert.equal(index.byKey["sentence:s1"].sentenceId, "s1");
  assert.equal(index.byKey["sentence:s1"].speechText, "Tell me about yourself.");
  assert.equal(index.byKey["token:t1"].paragraphId, "p1");
  assert.equal(index.byKey["token:t2"].text, ".");
});

test("getParagraphProgressIndex resolves a node key back to the owning paragraph index", () => {
  const index = buildPracticeNodeIndex(structuredContent);

  assert.equal(getParagraphProgressIndex(index, "paragraph:p1"), 0);
  assert.equal(getParagraphProgressIndex(index, "sentence:s1"), 0);
  assert.equal(getParagraphProgressIndex(index, "token:t1"), 0);
  assert.equal(getParagraphProgressIndex(index, null), null);
});

test("createSpeechCacheKey is stable for identical text", () => {
  assert.equal(
    createSpeechCacheKey("Hello from spoke", "English_expressive_narrator"),
    createSpeechCacheKey("Hello from spoke", "English_expressive_narrator"),
  );
  assert.notEqual(
    createSpeechCacheKey("Hello from spoke", "English_expressive_narrator"),
    createSpeechCacheKey("Hello again", "English_expressive_narrator"),
  );
  assert.notEqual(
    createSpeechCacheKey("Hello from spoke", "English_expressive_narrator"),
    createSpeechCacheKey("Hello from spoke", "English_magnetic_voiced_man"),
  );
});

test("setSpeechCacheEntry stores and replaces cache entries by cache key", () => {
  const cache = new Map<string, string>();

  const firstKey = createSpeechCacheKey("Hello from spoke", "English_expressive_narrator");
  const firstReplacement = setSpeechCacheEntry(cache, firstKey, "blob:first");
  assert.equal(firstReplacement, null);
  assert.equal(cache.get(firstKey), "blob:first");

  const secondReplacement = setSpeechCacheEntry(cache, firstKey, "blob:second");
  assert.equal(secondReplacement, "blob:first");
  assert.equal(cache.get(firstKey), "blob:second");
});

test("getPlaybackControlState enables replay for any selected node and stop only while active", () => {
  assert.deepEqual(getPlaybackControlState(null, "idle"), {
    canReplay: false,
    canStop: false,
  });

  assert.deepEqual(getPlaybackControlState("token:t1", "idle"), {
    canReplay: true,
    canStop: false,
  });

  assert.deepEqual(getPlaybackControlState("token:t1", "loading"), {
    canReplay: true,
    canStop: true,
  });

  assert.deepEqual(getPlaybackControlState("token:t1", "playing"), {
    canReplay: true,
    canStop: true,
  });
});

test("computeDistanceDrivenHover prefers token over sentence and paragraph when pointer is closest", () => {
  const layout = createTestLayoutIndex({
    paragraphs: [
      {
        key: "paragraph:p1",
        id: "p1",
        paragraphId: "p1",
        contentRect: { left: 100, top: 100, right: 500, bottom: 260 },
        hoverZoneRect: { left: 70, top: 70, right: 530, bottom: 290 },
        exitZoneRect: { left: 60, top: 60, right: 540, bottom: 300 },
      },
    ],
    sentences: [
      {
        key: "sentence:s1",
        id: "s1",
        paragraphId: "p1",
        sentenceId: "s1",
        contentRect: { left: 130, top: 130, right: 470, bottom: 190 },
        hoverZoneRect: { left: 115, top: 118, right: 485, bottom: 202 },
        exitZoneRect: { left: 103, top: 106, right: 497, bottom: 214 },
      },
    ],
    tokens: [
      {
        key: "token:t1",
        id: "t1",
        paragraphId: "p1",
        sentenceId: "s1",
        contentRect: { left: 155, top: 138, right: 205, bottom: 176 },
        hoverZoneRect: { left: 148, top: 132, right: 212, bottom: 182 },
        exitZoneRect: { left: 138, top: 124, right: 222, bottom: 190 },
        isPunctuation: false,
      },
    ],
  });

  const result = computeDistanceDrivenHover({
    pointer: { x: 165, y: 150, insideTextStage: true },
    currentHoveredKey: null,
    layout,
  });

  assert.equal(result.hoveredKey, "token:t1");
  assert.equal(result.reason, "token-hit");
});

test("buildLayoutNodeIndex builds paragraph, sentence, and token hit zones from measured rects", () => {
  const layout = buildLayoutNodeIndex({
    structuredContent,
    paragraphRectsById: new Map([
      ["p1", { left: 100, top: 100, right: 500, bottom: 260 }],
    ]),
    sentenceRectsById: new Map([
      ["s1", { left: 130, top: 130, right: 470, bottom: 190 }],
    ]),
    tokenRectsById: new Map([
      ["t1", { left: 155, top: 138, right: 205, bottom: 176 }],
    ]),
  });

  assert.equal(layout.paragraphKeys[0], "paragraph:p1");
  assert.equal(layout.sentenceKeys[0], "sentence:s1");
  assert.equal(layout.tokenKeys[0], "token:t1");
  assert.equal(layout.byKey["paragraph:p1"]?.hoverZoneRect.left, 76);
  assert.equal(layout.byKey["sentence:s1"]?.hoverZoneRect.left, 118);
  assert.equal(layout.byKey["token:t1"]?.hoverZoneRect.left, 149);
});

test("buildRectMapFromElements converts element rects into a rect map", () => {
  const element = {
    getBoundingClientRect: () => ({
      left: 10,
      top: 20,
      right: 30,
      bottom: 40,
    }),
  } as HTMLElement;

  const rects = buildRectMapFromElements(new Map([["p1", element]]));

  assert.deepEqual(rects.get("p1"), {
    left: 10,
    top: 20,
    right: 30,
    bottom: 40,
  });
});

test("computeDistanceDrivenHover falls back to sentence when pointer leaves token but stays in sentence zone", () => {
  const layout = createTestLayoutIndex({
    paragraphs: [
      {
        key: "paragraph:p1",
        id: "p1",
        paragraphId: "p1",
        contentRect: { left: 100, top: 100, right: 500, bottom: 260 },
        hoverZoneRect: { left: 70, top: 70, right: 530, bottom: 290 },
        exitZoneRect: { left: 60, top: 60, right: 540, bottom: 300 },
      },
    ],
    sentences: [
      {
        key: "sentence:s1",
        id: "s1",
        paragraphId: "p1",
        sentenceId: "s1",
        contentRect: { left: 130, top: 130, right: 470, bottom: 190 },
        hoverZoneRect: { left: 115, top: 118, right: 485, bottom: 202 },
        exitZoneRect: { left: 103, top: 106, right: 497, bottom: 214 },
      },
    ],
    tokens: [
      {
        key: "token:t1",
        id: "t1",
        paragraphId: "p1",
        sentenceId: "s1",
        contentRect: { left: 155, top: 138, right: 205, bottom: 176 },
        hoverZoneRect: { left: 148, top: 132, right: 212, bottom: 182 },
        exitZoneRect: { left: 138, top: 124, right: 222, bottom: 190 },
        isPunctuation: false,
      },
    ],
  });

  const result = computeDistanceDrivenHover({
    pointer: { x: 250, y: 150, insideTextStage: true },
    currentHoveredKey: "token:t1",
    layout,
  });

  assert.equal(result.hoveredKey, "sentence:s1");
  assert.equal(result.reason, "fallback");
});

test("computeDistanceDrivenHover holds token while pointer remains inside token exit zone", () => {
  const layout = createTestLayoutIndex({
    paragraphs: [
      {
        key: "paragraph:p1",
        id: "p1",
        paragraphId: "p1",
        contentRect: { left: 100, top: 100, right: 500, bottom: 260 },
        hoverZoneRect: { left: 70, top: 70, right: 530, bottom: 290 },
        exitZoneRect: { left: 60, top: 60, right: 540, bottom: 300 },
      },
    ],
    sentences: [
      {
        key: "sentence:s1",
        id: "s1",
        paragraphId: "p1",
        sentenceId: "s1",
        contentRect: { left: 130, top: 130, right: 470, bottom: 190 },
        hoverZoneRect: { left: 115, top: 118, right: 485, bottom: 202 },
        exitZoneRect: { left: 105, top: 108, right: 495, bottom: 212 },
      },
    ],
    tokens: [
      {
        key: "token:t1",
        id: "t1",
        paragraphId: "p1",
        sentenceId: "s1",
        contentRect: { left: 155, top: 138, right: 205, bottom: 176 },
        hoverZoneRect: { left: 148, top: 132, right: 212, bottom: 182 },
        exitZoneRect: { left: 138, top: 124, right: 222, bottom: 190 },
        isPunctuation: false,
      },
    ],
  });

  const result = computeDistanceDrivenHover({
    pointer: { x: 140, y: 130, insideTextStage: true },
    currentHoveredKey: "token:t1",
    layout,
  });

  assert.equal(result.hoveredKey, "token:t1");
  assert.equal(result.reason, "hold");
});

test("computeDistanceDrivenHover holds sentence while pointer remains inside sentence exit zone", () => {
  const layout = createTestLayoutIndex({
    paragraphs: [
      {
        key: "paragraph:p1",
        id: "p1",
        paragraphId: "p1",
        contentRect: { left: 100, top: 100, right: 500, bottom: 260 },
        hoverZoneRect: { left: 70, top: 70, right: 530, bottom: 290 },
        exitZoneRect: { left: 60, top: 60, right: 540, bottom: 300 },
      },
    ],
    sentences: [
      {
        key: "sentence:s1",
        id: "s1",
        paragraphId: "p1",
        sentenceId: "s1",
        contentRect: { left: 130, top: 130, right: 470, bottom: 190 },
        hoverZoneRect: { left: 115, top: 118, right: 485, bottom: 202 },
        exitZoneRect: { left: 100, top: 105, right: 500, bottom: 215 },
      },
    ],
    tokens: [],
  });

  const result = computeDistanceDrivenHover({
    pointer: { x: 108, y: 112, insideTextStage: true },
    currentHoveredKey: "sentence:s1",
    layout,
  });

  assert.equal(result.hoveredKey, "sentence:s1");
  assert.equal(result.reason, "hold");
});

test("computeDistanceDrivenHover falls back to paragraph when pointer is only inside paragraph zone", () => {
  const layout = createTestLayoutIndex({
    paragraphs: [
      {
        key: "paragraph:p1",
        id: "p1",
        paragraphId: "p1",
        contentRect: { left: 100, top: 100, right: 500, bottom: 260 },
        hoverZoneRect: { left: 70, top: 70, right: 530, bottom: 290 },
        exitZoneRect: { left: 60, top: 60, right: 540, bottom: 300 },
      },
    ],
    sentences: [
      {
        key: "sentence:s1",
        id: "s1",
        paragraphId: "p1",
        sentenceId: "s1",
        contentRect: { left: 130, top: 130, right: 470, bottom: 190 },
        hoverZoneRect: { left: 115, top: 118, right: 485, bottom: 202 },
        exitZoneRect: { left: 103, top: 106, right: 497, bottom: 214 },
      },
    ],
    tokens: [],
  });

  const result = computeDistanceDrivenHover({
    pointer: { x: 90, y: 90, insideTextStage: true },
    currentHoveredKey: "sentence:s1",
    layout,
  });

  assert.equal(result.hoveredKey, "paragraph:p1");
  assert.equal(result.reason, "fallback");
});

test("computeDistanceDrivenHover exits when pointer leaves the text stage", () => {
  const layout = createTestLayoutIndex({
    paragraphs: [
      {
        key: "paragraph:p1",
        id: "p1",
        paragraphId: "p1",
        contentRect: { left: 100, top: 100, right: 500, bottom: 260 },
        hoverZoneRect: { left: 70, top: 70, right: 530, bottom: 290 },
        exitZoneRect: { left: 60, top: 60, right: 540, bottom: 300 },
      },
    ],
    sentences: [],
    tokens: [],
  });

  const result = computeDistanceDrivenHover({
    pointer: { x: 0, y: 0, insideTextStage: false },
    currentHoveredKey: "paragraph:p1",
    layout,
  });

  assert.equal(result.hoveredKey, null);
  assert.equal(result.reason, "exit");
});
