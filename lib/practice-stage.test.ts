import test from "node:test";
import assert from "node:assert/strict";
import {
  getNextHeaderHidden,
  getStageViewportPadding,
} from "@/lib/practice-stage";

test("getNextHeaderHidden keeps header visible near the top of the stage scroll", () => {
  assert.equal(
    getNextHeaderHidden({
      previousHidden: true,
      scrollTop: 32,
      lastScrollTop: 12,
    }),
    false,
  );
});

test("getNextHeaderHidden hides the header after a meaningful downward stage scroll", () => {
  assert.equal(
    getNextHeaderHidden({
      previousHidden: false,
      scrollTop: 240,
      lastScrollTop: 180,
    }),
    true,
  );
});

test("getNextHeaderHidden reveals the header after a meaningful upward stage scroll", () => {
  assert.equal(
    getNextHeaderHidden({
      previousHidden: true,
      scrollTop: 180,
      lastScrollTop: 240,
    }),
    false,
  );
});

test("getStageViewportPadding returns stable stage insets from measured chrome heights", () => {
  assert.deepEqual(
    getStageViewportPadding({
      headerHeight: 120,
      playerHeight: 96,
      extraTop: 12,
      extraBottom: 16,
    }),
    {
      paddingTop: 132,
      paddingBottom: 112,
    },
  );
});
