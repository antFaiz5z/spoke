import test from "node:test";
import assert from "node:assert/strict";
import { getGeneratedDraftErrorMessage } from "@/lib/generated-draft-errors";
import {
  buildDiscardGeneratedDraftResponse,
  buildGeneratedDraftTitle,
  buildRebuiltGeneratedDraftTitle,
  buildInsertGeneratedDraftToStageResponse,
  finalizeGeneratedDraftTitle,
  normalizeGeneratedDraftText,
  parseGeneratedDraftResponse,
  shouldRetryGeneratedDraftValidation,
  validateGeneratedDraftText,
} from "@/lib/server/generated-drafts";

test("buildInsertGeneratedDraftToStageResponse returns an inserted draft lifecycle payload", () => {
  assert.deepEqual(buildInsertGeneratedDraftToStageResponse("gd_001"), {
    generatedDraftId: "gd_001",
    insertedToStage: true,
  });
});

test("buildDiscardGeneratedDraftResponse returns a discarded draft lifecycle payload", () => {
  assert.deepEqual(buildDiscardGeneratedDraftResponse("gd_001"), {
    generatedDraftId: "gd_001",
    status: "discarded",
    discarded: true,
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

test("buildRebuiltGeneratedDraftTitle derives a short dynamic title from normalized content", () => {
  assert.equal(
    buildRebuiltGeneratedDraftTitle({
      normalizedText:
        "Interviewer: Tell me about your product background.\n\nCandidate: I have worked on mobile apps for three years.",
      scenarioTitle: "Job Interview",
      contentKind: "dialogue",
      difficultyLevel: "B1",
    }),
    "Talking About Your Product Background",
  );
});

test("finalizeGeneratedDraftTitle keeps a short natural model title", () => {
  assert.equal(
    finalizeGeneratedDraftTitle({
      scenarioTitle: "Job Interview",
      contentKind: "dialogue",
      difficultyLevel: "B1",
      modelTitle: "Talking About Your Product Experience",
    }),
    "Talking About Your Product Experience",
  );
});

test("finalizeGeneratedDraftTitle falls back for empty or dirty model titles", () => {
  assert.equal(
    finalizeGeneratedDraftTitle({
      scenarioTitle: "Job Interview",
      contentKind: "dialogue",
      difficultyLevel: "B1",
      modelTitle: "Interviewer: Tell me about yourself.",
    }),
    "Job Interview Dialogue Draft (B1)",
  );

  assert.equal(
    finalizeGeneratedDraftTitle({
      scenarioTitle: "Job Interview",
      contentKind: "dialogue",
      difficultyLevel: "B1",
      modelTitle: " ",
    }),
    "Job Interview Dialogue Draft (B1)",
  );
});

test("parseGeneratedDraftResponse extracts title and body from a single model response", () => {
  assert.deepEqual(
    parseGeneratedDraftResponse(
      "Title: Talking About Your Product Experience\n\nBody:\nInterviewer: Tell me about your background.\n\nCandidate: I have worked on mobile apps for three years.",
    ),
    {
      title: "Talking About Your Product Experience",
      body: "Interviewer: Tell me about your background.\n\nCandidate: I have worked on mobile apps for three years.",
    },
  );
});

test("parseGeneratedDraftResponse falls back to full text body when title section is missing", () => {
  assert.deepEqual(parseGeneratedDraftResponse("Hello there.\n\nThank you for meeting with me."), {
    title: null,
    body: "Hello there.\n\nThank you for meeting with me.",
  });
});

test("validateGeneratedDraftText accepts English-only practice text", () => {
  assert.doesNotThrow(() =>
    validateGeneratedDraftText(
      "Hello, thanks for coming in.\n\nThank you for having me.",
      "dialogue",
    ),
  );
});

test("validateGeneratedDraftText rejects generated text containing Chinese characters", () => {
  assert.throws(
    () =>
      validateGeneratedDraftText(
        "Interviewer: Tell me about yourself.\n面试官：你能告诉我们一些关于你的技术经验吗？",
        "dialogue",
      ),
    /English-only/,
  );
});

test("normalizeGeneratedDraftText strips dialogue scaffolding and expands turns into paragraphs", () => {
  const normalized = normalizeGeneratedDraftText(
    "(Situation: You are taking a job interview.)\nInterviewer: Tell me about yourself.\nCandidate: I enjoy product work.\n(Goal: Answer the interviewer clearly.)",
    "dialogue",
  );

  assert.equal(
    normalized,
    "Situation: You are taking a job interview.\n\nInterviewer: Tell me about yourself.\n\nCandidate: I enjoy product work.\n\nGoal: Answer the interviewer clearly.",
  );
});

test("normalizeGeneratedDraftText strips think blocks and splits dialogue turns after punctuation", () => {
  const normalized = normalizeGeneratedDraftText(
    "<think>Internal reasoning here.</think>\nRecruiter: Tell me about yourself?Candidate: I have three years of product experience.\nRecruiter: Why do you want this role?",
    "dialogue",
  );

  assert.equal(
    normalized,
    "Recruiter: Tell me about yourself?\n\nCandidate: I have three years of product experience.\n\nRecruiter: Why do you want this role?",
  );
});

test("validateGeneratedDraftText rejects think-tag leakage", () => {
  assert.throws(
    () => validateGeneratedDraftText("<think>hidden reasoning</think>\nHello there.", "monologue"),
    /internal model reasoning/i,
  );
});

test("validateGeneratedDraftText rejects dialogue drafts without enough dialogue blocks", () => {
  assert.throws(
    () => validateGeneratedDraftText("Hello there.", "dialogue"),
    /at least two dialogue blocks/i,
  );
});

test("validateGeneratedDraftText rejects dialogue drafts with excessive dialogue blocks", () => {
  const tooLongDialogue = Array.from({ length: 13 }, (_, index) =>
    index % 2 === 0
      ? `Interviewer: Question ${index + 1}?`
      : `Candidate: Answer ${index + 1}.`,
  ).join("\n\n");

  assert.throws(
    () => validateGeneratedDraftText(tooLongDialogue, "dialogue"),
    /too many dialogue blocks/i,
  );
});

test("shouldRetryGeneratedDraftValidation retries all dialogue-like kinds for missing blocks", () => {
  assert.equal(
    shouldRetryGeneratedDraftValidation("dialogue", "Generated dialogue must contain at least two dialogue blocks"),
    true,
  );
  assert.equal(
    shouldRetryGeneratedDraftValidation("qa", "Generated dialogue must contain at least two dialogue blocks"),
    true,
  );
  assert.equal(
    shouldRetryGeneratedDraftValidation("script", "Generated dialogue must contain at least two dialogue blocks"),
    true,
  );
  assert.equal(
    shouldRetryGeneratedDraftValidation("monologue", "Generated dialogue must contain at least two dialogue blocks"),
    false,
  );
});

test("getGeneratedDraftErrorMessage rewrites dialogue block validation into user-facing copy", () => {
  assert.equal(
    getGeneratedDraftErrorMessage("Generated dialogue must contain at least two dialogue blocks"),
    "The model returned only one dialogue block. Please try again.",
  );
  assert.equal(
    getGeneratedDraftErrorMessage("Generated dialogue has too many dialogue blocks"),
    "The model returned an overly long dialogue. Please try again.",
  );
  assert.equal(
    getGeneratedDraftErrorMessage("Some other error"),
    "Some other error",
  );
});
