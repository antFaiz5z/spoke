import test from "node:test";
import assert from "node:assert/strict";
import {
  getHoverStateClass,
  getLevelColorToken,
  getLevelShapeLabel,
  getPlayingStateClass,
  getVisualStateIntensity,
} from "./stage-visuals";

test("visual grammar maps levels to stable color tokens", () => {
  assert.equal(getLevelColorToken("paragraph"), "paragraph");
  assert.equal(getLevelColorToken("sentence"), "sentence");
  assert.equal(getLevelColorToken("token"), "token");
});

test("visual grammar maps levels to distinct shape labels", () => {
  assert.equal(getLevelShapeLabel("paragraph"), "block");
  assert.equal(getLevelShapeLabel("sentence"), "band");
  assert.equal(getLevelShapeLabel("token"), "inline");
});

test("visual grammar maps states to stable intensity labels", () => {
  assert.equal(getVisualStateIntensity("base"), "subtle");
  assert.equal(getVisualStateIntensity("hover"), "light");
  assert.equal(getVisualStateIntensity("playing"), "strong");
});

test("hover classes stay lighter than playing classes at each level", () => {
  assert.match(getHoverStateClass("paragraph"), /\/45|\/8/);
  assert.match(getPlayingStateClass("paragraph"), /shadow|\/12/);
  assert.match(getHoverStateClass("sentence"), /\/45|\/10/);
  assert.match(getPlayingStateClass("sentence"), /\/12/);
  assert.match(getHoverStateClass("token"), /\/15/);
  assert.match(getPlayingStateClass("token"), /\/25/);
});
