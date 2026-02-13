export const RULE_REMOTION_TRANSITIONS = `# Remotion Transitions — TransitionSeries

## Basic usage
\`\`\`
return React.createElement(TransitionSeries, null,
  React.createElement(TransitionSeries.Sequence, { durationInFrames: 60 },
    React.createElement(AbsoluteFill, { style: { backgroundColor: "#667eea" } },
      React.createElement("div", { style: { color: "white", fontSize: 48 } }, "Scene A")
    )
  ),
  React.createElement(TransitionSeries.Transition, {
    presentation: fade(), timing: linearTiming({ durationInFrames: 15 })
  }),
  React.createElement(TransitionSeries.Sequence, { durationInFrames: 60 },
    React.createElement(AbsoluteFill, { style: { backgroundColor: "#764ba2" } },
      React.createElement("div", { style: { color: "white", fontSize: 48 } }, "Scene B")
    )
  )
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
Example: two 60-frame scenes + 15-frame transition = 105 frames.
`;
