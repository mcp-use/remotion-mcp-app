export const RULE_REMOTION_SEQUENCING = `# Remotion Sequencing — Sequence, delay

## Sequence
Delays when an element appears.
\`\`\`
var { fps } = useVideoConfig();

return React.createElement(AbsoluteFill, null,
  React.createElement(Sequence, { from: 0, durationInFrames: 2 * fps },
    React.createElement("div", { style: { color: "white", fontSize: 48 } }, "First")
  ),
  React.createElement(Sequence, { from: 2 * fps, durationInFrames: 2 * fps },
    React.createElement("div", { style: { color: "white", fontSize: 48 } }, "Second")
  )
);
\`\`\`

By default Sequence wraps children in an absolute fill. Use layout="none" to prevent:
\`\`\`
React.createElement(Sequence, { from: 30, layout: "none" }, child)
\`\`\`

## Frame references inside Sequence
useCurrentFrame() returns the LOCAL frame (starts at 0, not the global position).

## Nested Sequences
\`\`\`
return React.createElement(Sequence, { from: 0, durationInFrames: 120 },
  React.createElement(AbsoluteFill, { style: { backgroundColor: "#000" } }),
  React.createElement(Sequence, { from: 15, durationInFrames: 90, layout: "none" },
    React.createElement("div", { style: { color: "white" } }, "Title")
  ),
  React.createElement(Sequence, { from: 45, durationInFrames: 60, layout: "none" },
    React.createElement("div", { style: { color: "#aaa" } }, "Subtitle")
  )
);
\`\`\`
`;
