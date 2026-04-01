import test from "node:test";
import assert from "node:assert/strict";
import { buildFirstSentenceByParagraphId, buildSentenceTrack } from "./practice-stage-controller";
import type { StructuredContent } from "@/lib/types/content";

const structuredContent: StructuredContent = {
  version: 1,
  paragraphs: [
    {
      id: "p0",
      index: 0,
      paragraphType: "meta",
      metaLabel: "Situation",
      speakerId: null,
      speakerLabel: null,
      text: "You are taking a job interview.",
      startOffset: 0,
      endOffset: 30,
      sentences: [
        {
          id: "s0",
          index: 0,
          text: "You are taking a job interview.",
          startOffset: 0,
          endOffset: 30,
          tokens: [],
        },
      ],
    },
    {
      id: "p1",
      index: 1,
      paragraphType: "spoken",
      metaLabel: null,
      speakerId: "interviewer",
      speakerLabel: "Interviewer",
      text: "Tell me about yourself.",
      startOffset: 32,
      endOffset: 56,
      sentences: [
        {
          id: "s1",
          index: 0,
          text: "Tell me about yourself.",
          startOffset: 32,
          endOffset: 56,
          tokens: [],
        },
        {
          id: "s2",
          index: 1,
          text: "What are you working on now?",
          startOffset: 57,
          endOffset: 85,
          tokens: [],
        },
      ],
    },
  ],
};

test("buildSentenceTrack skips meta paragraphs", () => {
  const track = buildSentenceTrack(structuredContent);

  assert.deepEqual(track.map((item) => item.id), ["s1", "s2"]);
});

test("buildFirstSentenceByParagraphId skips meta paragraphs", () => {
  const firstByParagraph = buildFirstSentenceByParagraphId(structuredContent);

  assert.equal(firstByParagraph.has("p0"), false);
  assert.equal(firstByParagraph.get("p1"), "sentence:s1");
});
