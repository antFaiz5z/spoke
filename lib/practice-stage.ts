export type HeaderHiddenInput = {
  previousHidden: boolean;
  scrollTop: number;
  lastScrollTop: number;
  threshold?: number;
  revealOffset?: number;
};

export type StageViewportPaddingInput = {
  headerHeight: number;
  playerHeight: number;
  extraTop?: number;
  extraBottom?: number;
};

export function getNextHeaderHidden(input: HeaderHiddenInput): boolean {
  const threshold = input.threshold ?? 8;
  const revealOffset = input.revealOffset ?? 80;
  const delta = input.scrollTop - input.lastScrollTop;

  if (input.scrollTop < revealOffset) {
    return false;
  }

  if (delta > threshold) {
    return true;
  }

  if (delta < -threshold) {
    return false;
  }

  return input.previousHidden;
}

export function getStageViewportPadding(input: StageViewportPaddingInput) {
  return {
    paddingTop: Math.max(0, input.headerHeight + (input.extraTop ?? 0)),
    paddingBottom: Math.max(0, input.playerHeight + (input.extraBottom ?? 0)),
  };
}
