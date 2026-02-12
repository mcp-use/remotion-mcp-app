import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { flip } from "@remotion/transitions/flip";
// clockWipe requires width/height at call time, handled via useVideoConfig in runtime
import { SceneRenderer } from "./SceneRenderer";
import type { SceneData, TransitionData } from "../../../types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getPresentation(transition: TransitionData): any {
  switch (transition.type) {
    case "fade":
      return fade();
    case "slide":
      return slide({ direction: transition.direction || "from-right" });
    case "wipe":
      return wipe({ direction: transition.direction || "from-left" });
    case "flip":
      return flip({ direction: transition.direction || "from-right" });
    case "clockWipe":
      return fade();
    default:
      return fade();
  }
}

export const DynamicComposition: React.FC<{ scenes: SceneData[] }> = ({
  scenes,
}) => {
  if (!scenes || scenes.length === 0) {
    return (
      <AbsoluteFill
        style={{
          backgroundColor: "#141414",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div
          style={{
            color: "#ffffff",
            fontSize: 32,
            fontFamily: "sans-serif",
            textAlign: "center",
          }}
        >
          No scenes defined
        </div>
      </AbsoluteFill>
    );
  }

  const hasTransitions = scenes.some(
    (s, i) => s.transition && i < scenes.length - 1
  );

  if (hasTransitions) {
    return (
      <TransitionSeries>
        {scenes.map((scene, i) => (
          <React.Fragment key={scene.id}>
            <TransitionSeries.Sequence
              durationInFrames={scene.durationInFrames}
            >
              <SceneRenderer scene={scene} />
            </TransitionSeries.Sequence>
            {scene.transition && i < scenes.length - 1 && (
              <TransitionSeries.Transition
                presentation={getPresentation(scene.transition)}
                timing={linearTiming({
                  durationInFrames: scene.transition.durationInFrames,
                })}
              />
            )}
          </React.Fragment>
        ))}
      </TransitionSeries>
    );
  }

  let fromFrame = 0;
  return (
    <AbsoluteFill>
      {scenes.map((scene) => {
        const from = fromFrame;
        fromFrame += scene.durationInFrames;
        return (
          <Sequence
            key={scene.id}
            from={from}
            durationInFrames={scene.durationInFrames}
          >
            <SceneRenderer scene={scene} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
