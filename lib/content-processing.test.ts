import test from "node:test";
import assert from "node:assert/strict";
import { buildStructuredContent } from "@/lib/content-processing";

test("buildStructuredContent extracts speakerLabel and keeps spoken text for dialogue lines", () => {
  const content = buildStructuredContent(
    "Interviewer: Tell me about yourself.\n\nCandidate: I enjoy product work.",
  );

  assert.equal(content.paragraphs[0]?.speakerLabel, "Interviewer");
  assert.equal(content.paragraphs[0]?.speakerId, "interviewer");
  assert.equal(content.paragraphs[0]?.text, "Tell me about yourself.");
  assert.equal(content.paragraphs[0]?.sentences[0]?.text, "Tell me about yourself.");
  assert.equal(content.paragraphs[0]?.sentences[0]?.tokens[0]?.text, "Tell");

  assert.equal(content.paragraphs[1]?.speakerLabel, "Candidate");
  assert.equal(content.paragraphs[1]?.text, "I enjoy product work.");
});
