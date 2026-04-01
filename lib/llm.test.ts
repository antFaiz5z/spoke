import test from "node:test";
import assert from "node:assert/strict";
import {
  buildGeneratedDraftMessages,
  getGenerationFormatRule,
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
  assert.match(messages[0]?.content ?? "", /Return exactly two sections/i);
  assert.match(messages[0]?.content ?? "", /Title:/i);
  assert.match(messages[0]?.content ?? "", /Body:/i);
  assert.equal(messages[1]?.role, "user");
  assert.match(messages[1]?.content ?? "", /Job Interview/);
  assert.match(messages[1]?.content ?? "", /dialogue/);
  assert.match(messages[1]?.content ?? "", /B1/);
  assert.match(messages[1]?.content ?? "", /speaker-attributed dialogue lines only/i);
  assert.match(messages[1]?.content ?? "", /4 to 8 turns/i);
  assert.match(messages[1]?.content ?? "", /one turn per paragraph/i);
  assert.match(messages[1]?.content ?? "", /Use stable speaker labels such as Interviewer and Candidate/i);
  assert.match(messages[1]?.content ?? "", /1 to 2 sentences per turn/i);
  assert.match(messages[1]?.content ?? "", /Stop after the final turn/i);
});

test("buildGeneratedDraftMessages adds stricter dialogue block rules for retry attempts", () => {
  const messages = buildGeneratedDraftMessages(
    {
      scenarioTitle: "Job Interview",
      prompt: "Generate a mock interview for a product manager role.",
      contentKind: "dialogue",
      difficultyLevel: "B1",
    },
    { retryForDialogueBlocks: true },
  );

  assert.match(messages[1]?.content ?? "", /separate every turn with a blank line/i);
  assert.match(messages[1]?.content ?? "", /do not collapse the whole dialogue into one paragraph/i);
});

test("getGenerationFormatRule requires multi-paragraph prose for monologue content", () => {
  const rule = getGenerationFormatRule("monologue");

  assert.match(rule, /2 to 4 paragraphs/i);
  assert.match(rule, /full prose paragraphs/i);
  assert.doesNotMatch(rule, /speaker-attributed/i);
});

test("getGenerationFormatRule requires turn-based output for dialogue-like content", () => {
  const dialogueRule = getGenerationFormatRule("dialogue");
  const qaRule = getGenerationFormatRule("qa");

  assert.match(dialogueRule, /speaker-attributed dialogue lines only/i);
  assert.match(dialogueRule, /4 to 8 turns/i);
  assert.match(dialogueRule, /Interviewer and Candidate/i);
  assert.match(qaRule, /speaker-attributed dialogue lines only/i);
});
