import test from "node:test";
import assert from "node:assert/strict";
import { resolveHighlightStateClass } from "./highlight-layer";

test("resolveHighlightStateClass prefers playing over hover", () => {
  const value = resolveHighlightStateClass({
    isMetaParagraph: false,
    hoveredKey: "sentence:s1",
    playingKey: "sentence:s1",
    currentSentenceKey: "sentence:s1",
    targetKey: "sentence:s1",
    level: "sentence",
  });

  assert.match(value, /ring-2/);
  assert.match(value, /bg-\[var\(--sentence\)\]\/12/);
});

test("resolveHighlightStateClass uses current sentence as a sentence-level fallback", () => {
  const value = resolveHighlightStateClass({
    isMetaParagraph: false,
    hoveredKey: null,
    playingKey: null,
    currentSentenceKey: "sentence:s1",
    targetKey: "sentence:s1",
    level: "sentence",
  });

  assert.match(value, /ring-2/);
  assert.match(value, /bg-\[var\(--sentence\)\]\/10/);
});

test("resolveHighlightStateClass disables highlight for meta paragraphs", () => {
  const value = resolveHighlightStateClass({
    isMetaParagraph: true,
    hoveredKey: "paragraph:p1",
    playingKey: "paragraph:p1",
    targetKey: "paragraph:p1",
    level: "paragraph",
  });

  assert.equal(value, "");
});
