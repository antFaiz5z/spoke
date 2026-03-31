import test from "node:test";
import assert from "node:assert/strict";
import { buildInsertGeneratedDraftToStageResponse } from "@/lib/server/generated-drafts";

test("buildInsertGeneratedDraftToStageResponse returns an inserted draft lifecycle payload", () => {
  assert.deepEqual(buildInsertGeneratedDraftToStageResponse("gd_001"), {
    generatedDraftId: "gd_001",
    insertedToStage: true,
  });
});
