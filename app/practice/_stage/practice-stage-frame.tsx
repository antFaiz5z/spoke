import type { ReactNode } from "react";
import { FloatingPlayer } from "./floating-player";
import { StageHeader } from "./stage-header";
import { TextStageSurface } from "./text-stage-surface";

type PracticeStageFrameProps = {
  headerProps: React.ComponentProps<typeof StageHeader>;
  textStageProps: React.ComponentProps<typeof TextStageSurface>;
  playerProps: React.ComponentProps<typeof FloatingPlayer>;
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
          <TextStageSurface {...textStageProps} />
          {overlay}
        </div>
      </div>

      {floatingActionButton}

      <FloatingPlayer {...playerProps} />
    </main>
  );
}
