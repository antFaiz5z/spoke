import test from "node:test";
import assert from "node:assert/strict";
import {
  buildGeneratedDraftMessages,
  getGenerationModelForKind,
} from "@/lib/llm";

test("getGenerationModelForKind uses dialogue-oriented model for dialogue content", () => {
  assert.equal(getGenerationModelForKind("dialogue"), "M2-her");
  assert.equal(getGenerationModelForKind("qa"), "MiniMax-M2.5");
});

test("buildGeneratedDraftMessages builds a constrained generation prompt", () => {
  const messages = buildGeneratedDraftMessages({
    scenarioTitle: "Job Interview",
    prompt: "Generate a mock interview for a product manager role.",
    contentKind: "dialogue",
    difficultyLevel: "B1",
  });

  assert.equal(messages[0]?.role, "system");
  assert.match(messages[0]?.content ?? "", /English speaking practice/);
  assert.match(messages[0]?.content ?? "", /English only/i);
  assert.match(messages[0]?.content ?? "", /no Chinese/i);
  assert.match(messages[0]?.content ?? "", /Do not add a title/i);
  assert.equal(messages[1]?.role, "user");
  assert.match(messages[1]?.content ?? "", /Job Interview/);
  assert.match(messages[1]?.content ?? "", /dialogue/);
  assert.match(messages[1]?.content ?? "", /B1/);
});
