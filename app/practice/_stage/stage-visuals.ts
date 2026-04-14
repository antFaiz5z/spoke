import type { HoverLevel } from "@/lib/types/runtime";

export const STAGE_PARAGRAPH_CARD_BASE_CLASS =
  "rounded-[1.5rem] border p-5 transition";

export const STAGE_SENTENCE_BASE_CLASS =
  "inline-flex flex-wrap items-center gap-x-2 gap-y-3 rounded-xl px-1 py-1 transition";

export const STAGE_TOKEN_BASE_CLASS =
  "rounded-md px-1.5 py-0.5 text-left transition";

export type VisualState = "base" | "hover" | "playing";

export function getLevelColorToken(level: HoverLevel) {
  if (level === "paragraph") {
    return "paragraph";
  }
  if (level === "sentence") {
    return "sentence";
  }
  return "token";
}

export function getLevelShapeLabel(level: HoverLevel) {
  if (level === "paragraph") {
    return "block";
  }
  if (level === "sentence") {
    return "band";
  }
  return "inline";
}

export function getVisualStateIntensity(state: VisualState) {
  if (state === "playing") {
    return "strong";
  }
  if (state === "hover") {
    return "light";
  }
  return "subtle";
}

export function getParagraphToneClass(index: number) {
  if (index === 0) {
    return "border-[var(--paragraph)]/35 bg-[var(--paragraph)]/6";
  }
  if (index % 2 === 0) {
    return "border-[var(--sentence)]/25 bg-[var(--sentence)]/5";
  }
  return "border-[var(--token)]/20 bg-[var(--token)]/5";
}

export function getHoverStateClass(level: HoverLevel) {
  if (level === "paragraph") {
    return "ring-2 ring-[var(--paragraph)]/45 bg-[var(--paragraph)]/8";
  }
  if (level === "sentence") {
    return "ring-2 ring-[var(--sentence)]/45 bg-[var(--sentence)]/10";
  }
  return "bg-[var(--token)]/15 text-black";
}

export function getPlayingStateClass(level: HoverLevel) {
  if (level === "paragraph") {
    return "ring-2 ring-[var(--paragraph)] bg-[var(--paragraph)]/12 shadow-[0_0_0_1px_rgba(194,65,12,0.08)]";
  }
  if (level === "sentence") {
    return "ring-2 ring-[var(--sentence)] bg-[var(--sentence)]/12";
  }
  return "bg-[var(--token)]/25 text-black";
}
