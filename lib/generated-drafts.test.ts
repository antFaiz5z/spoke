import test from "node:test";
import assert from "node:assert/strict";
import {
  buildGeneratedDraftTitle,
  buildInsertGeneratedDraftToStageResponse,
  validateGeneratedDraftText,
} from "@/lib/server/generated-drafts";

test("buildInsertGeneratedDraftToStageResponse returns an inserted draft lifecycle payload", () => {
  assert.deepEqual(buildInsertGeneratedDraftToStageResponse("gd_001"), {
    generatedDraftId: "gd_001",
    insertedToStage: true,
  });
});

test("buildGeneratedDraftTitle derives a stable metadata title instead of using body text", () => {
  assert.equal(
    buildGeneratedDraftTitle({
      scenarioTitle: "Job Interview",
      contentKind: "dialogue",
      difficultyLevel: "B1",
    }),
    "Job Interview Dialogue Draft (B1)",
  );
});

test("validateGeneratedDraftText accepts English-only practice text", () => {
  assert.doesNotThrow(() =>
    validateGeneratedDraftText("Interviewer: Tell me about yourself.\nCandidate: I enjoy product work."),
  );
});

test("validateGeneratedDraftText rejects generated text containing Chinese characters", () => {
  assert.throws(
    () =>
      validateGeneratedDraftText(
        "Interviewer: Tell me about yourself.\n面试官：你能告诉我们一些关于你的技术经验吗？",
      ),
    /English-only/,
  );
});
