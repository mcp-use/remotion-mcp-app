export const RULE_REMOTION_ANIMATIONS = `# Remotion Animations

All animations MUST be driven by useCurrentFrame().
CSS transitions and CSS animations are FORBIDDEN — they will not render correctly.

## Basic fade in
\`\`\`
var frame = useCurrentFrame();
var { fps } = useVideoConfig();
var opacity = interpolate(frame, [0, 2 * fps], [0, 1], { extrapolateRight: "clamp" });

return React.createElement("div", { style: { opacity: opacity } }, "Hello World!");
\`\`\`

## Key principles
- useCurrentFrame() returns the current frame number (integer, starts at 0)
- useVideoConfig() returns { width, height, fps, durationInFrames }
- Write timing in seconds: multiply by fps (e.g. 2 * fps = 2 seconds)
- Always clamp with { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
- Never use CSS transition, animation, or @keyframes
`;
