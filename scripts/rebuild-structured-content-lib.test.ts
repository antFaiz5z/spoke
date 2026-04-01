import test from "node:test";
import assert from "node:assert/strict";
import {
  buildStructuredContentRebuildPayload,
  parseRebuildStructuredContentArgs,
} from "@/scripts/rebuild-structured-content-lib";

test("parseRebuildStructuredContentArgs defaults to dry-run and all targets", () => {
  assert.deepEqual(parseRebuildStructuredContentArgs([]), {
    dryRun: true,
    apply: false,
    target: "all",
  });
});

test("parseRebuildStructuredContentArgs accepts apply and content-items target", () => {
  assert.deepEqual(
    parseRebuildStructuredContentArgs(["--apply", "--target", "content-items"]),
    {
      dryRun: false,
      apply: true,
      target: "content-items",
    },
  );
});

test("buildStructuredContentRebuildPayload rebuilds normalized text and speaker labels", () => {
  const payload = buildStructuredContentRebuildPayload(
    "Interviewer: Tell me about yourself.\n\nCandidate: I enjoy product work.",
  );

  assert.equal(payload.normalizedText, "Interviewer: Tell me about yourself.\n\nCandidate: I enjoy product work.");
  assert.equal(payload.paragraphCount, 2);
  assert.equal(payload.speakerLabelCount, 2);
  assert.equal(payload.structuredContent.paragraphs[0]?.speakerLabel, "Interviewer");
  assert.equal(payload.structuredContent.paragraphs[1]?.speakerLabel, "Candidate");
});
