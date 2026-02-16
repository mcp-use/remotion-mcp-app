export const RULE_REMOTION_TRANSITIONS = `# Remotion Transitions — TransitionSeries

TransitionSeries is the BEST way to build multi-scene videos.
It handles scene switching automatically — no overlapping, no manual durationInFrames math.

## Correct imports (important)
\`\`\`tsx
import {TransitionSeries, linearTiming, springTiming} from "@remotion/transitions";
import {fade} from "@remotion/transitions/fade";
import {slide} from "@remotion/transitions/slide";
import {wipe} from "@remotion/transitions/wipe";
import {flip} from "@remotion/transitions/flip";
\`\`\`

Do NOT import \`TransitionSeries\` from \`remotion\`.

## Basic usage
\`\`\`jsx
return (
  <TransitionSeries>
    <TransitionSeries.Sequence durationInFrames={60}>
      <AbsoluteFill style={{ backgroundColor: "#667eea", justifyContent: "center", alignItems: "center" }}>
        <div style={{ color: "#fff", fontSize: 48 }}>Scene A</div>
      </AbsoluteFill>
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition
      presentation={fade()}
      timing={linearTiming({ durationInFrames: 15 })}
    />
    <TransitionSeries.Sequence durationInFrames={60}>
      <AbsoluteFill style={{ backgroundColor: "#764ba2", justifyContent: "center", alignItems: "center" }}>
        <div style={{ color: "#fff", fontSize: 48 }}>Scene B</div>
      </AbsoluteFill>
    </TransitionSeries.Sequence>
  </TransitionSeries>
);
\`\`\`

## Available transitions
- fade()
- slide({ direction: "from-left" })
- wipe({ direction: "from-right" })
- flip({ direction: "from-top" })

Directions: "from-left", "from-right", "from-top", "from-bottom"

## Timing
- linearTiming({ durationInFrames: 20 })
- springTiming({ config: { damping: 200 }, durationInFrames: 25 })

## Duration calculation
Transitions OVERLAP adjacent scenes. Total = sum of sequences - sum of transitions.
Example: two 60-frame scenes + one 15-frame transition = 105 frames total.

## Many scenes with transitions
\`\`\`jsx
const scenes = [
  { bg: "#667eea", text: "Introduction" },
  { bg: "#764ba2", text: "Features" },
  { bg: "#f093fb", text: "Conclusion" },
];

return (
  <TransitionSeries>
    {scenes.flatMap((scene, i) => {
      const seq = (
        <TransitionSeries.Sequence key={"s" + i} durationInFrames={90}>
          <AbsoluteFill style={{ backgroundColor: scene.bg, justifyContent: "center", alignItems: "center" }}>
            <div style={{ color: "#fff", fontSize: 64, fontWeight: 700 }}>{scene.text}</div>
          </AbsoluteFill>
        </TransitionSeries.Sequence>
      );
      if (i === scenes.length - 1) return [seq];
      return [
        seq,
        <TransitionSeries.Transition
          key={"t" + i}
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 20 })}
        />,
      ];
    })}
  </TransitionSeries>
);
\`\`\`
`;
