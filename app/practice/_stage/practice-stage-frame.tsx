import type { ReactNode } from "react";
import { PlaybackBar } from "./playback-bar";
import { StageHeader } from "./stage-header";
import { TextStage } from "./text-stage";

type PracticeStageFrameProps = {
  headerProps: React.ComponentProps<typeof StageHeader>;
  textStageProps: React.ComponentProps<typeof TextStage>;
  playerProps: React.ComponentProps<typeof PlaybackBar>;
  overlay?: ReactNode;
  floatingActionButton?: ReactNode;
};

export function PracticeStageFrame({
  headerProps,
  textStageProps,
  playerProps,
  overlay,
  floatingActionButton,
}: PracticeStageFrameProps) {
  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <StageHeader {...headerProps} />

      <div className="fixed inset-0">
        <div className="relative h-full overflow-hidden">
          <TextStage {...textStageProps} />
          {overlay}
        </div>
      </div>

      {floatingActionButton}

      <PlaybackBar {...playerProps} />
    </main>
  );
}
