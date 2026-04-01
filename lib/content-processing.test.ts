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

test("buildStructuredContent recognizes meta labels without treating them as speakers", () => {
  const content = buildStructuredContent(
    "Situation: You are taking a job interview.\n\nInterviewer: Tell me about yourself.\n\nGoal: Answer clearly.",
  );

  assert.equal(content.paragraphs[0]?.paragraphType, "meta");
  assert.equal(content.paragraphs[0]?.metaLabel, "Situation");
  assert.equal(content.paragraphs[0]?.speakerLabel, null);
  assert.equal(content.paragraphs[0]?.text, "You are taking a job interview.");

  assert.equal(content.paragraphs[1]?.paragraphType, "spoken");
  assert.equal(content.paragraphs[1]?.speakerLabel, "Interviewer");
  assert.equal(content.paragraphs[1]?.metaLabel, null);

  assert.equal(content.paragraphs[2]?.paragraphType, "meta");
  assert.equal(content.paragraphs[2]?.metaLabel, "Goal");
});

test("buildStructuredContent splits multi-sentence paragraphs and punctuation tokens", () => {
  const content = buildStructuredContent(
    "Candidate: I build mobile products. I also work with analytics!",
  );

  assert.equal(content.paragraphs[0]?.speakerLabel, "Candidate");
  assert.equal(content.paragraphs[0]?.sentences.length, 2);
  assert.equal(content.paragraphs[0]?.sentences[0]?.text, "I build mobile products.");
  assert.equal(content.paragraphs[0]?.sentences[1]?.text, "I also work with analytics!");
  assert.deepEqual(
    content.paragraphs[0]?.sentences[0]?.tokens.map((token) => token.text),
    ["I", "build", "mobile", "products", "."],
  );
  assert.equal(content.paragraphs[0]?.sentences[0]?.tokens[4]?.isPunctuation, true);
});
