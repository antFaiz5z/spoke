import test from "node:test";
import assert from "node:assert/strict";
import { buildSentenceTranslationIndex } from "@/lib/translations";

test("buildSentenceTranslationIndex returns an empty map when no bundle is present", () => {
  assert.equal(buildSentenceTranslationIndex(null).size, 0);
});

test("buildSentenceTranslationIndex indexes sentence translations by sentence id", () => {
  const index = buildSentenceTranslationIndex({
    language: "zh-CN",
    sentenceTranslations: [
      { sentenceId: "s1", text: "请介绍一下你自己。" },
      { sentenceId: "s2", text: "你目前在做什么？" },
    ],
  });

  assert.equal(index.get("s1"), "请介绍一下你自己。");
  assert.equal(index.get("s2"), "你目前在做什么？");
});

test("buildSentenceTranslationIndex skips blank translation rows", () => {
  const index = buildSentenceTranslationIndex({
    language: "zh-CN",
    sentenceTranslations: [
      { sentenceId: "s1", text: "   " },
      { sentenceId: "s2", text: "你好" },
    ],
  });

  assert.equal(index.has("s1"), false);
  assert.equal(index.get("s2"), "你好");
});
