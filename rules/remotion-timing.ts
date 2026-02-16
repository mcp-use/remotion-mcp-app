export const RULE_REMOTION_TIMING = `# Remotion Timing — interpolate, spring, Easing

## interpolate
Maps a value from one range to another.
\`\`\`jsx
const opacity = interpolate(frame, [0, 100], [0, 1]);
\`\`\`

Clamping (recommended):
\`\`\`jsx
const opacity = interpolate(frame, [0, 100], [0, 1], {
  extrapolateRight: "clamp", extrapolateLeft: "clamp",
});
\`\`\`

## spring
Physics-based animation. Goes from 0 to 1 with natural motion.
\`\`\`jsx
const frame = useCurrentFrame();
const { fps } = useVideoConfig();
const scale = spring({ frame, fps });
\`\`\`

### Spring configs
- Default: { mass: 1, damping: 10, stiffness: 100 } (slight bounce)
- Smooth: { damping: 200 }
- Snappy: { damping: 20, stiffness: 200 }
- Bouncy: { damping: 8 }
- Heavy: { damping: 15, stiffness: 80, mass: 2 }

### Delay
\`\`\`jsx
const entrance = spring({ frame, fps, delay: 20 });
\`\`\`

### Fixed duration
\`\`\`jsx
const s = spring({ frame, fps, durationInFrames: 40 });
\`\`\`

### Combining spring with interpolate
\`\`\`jsx
const progress = spring({ frame, fps });
const rotation = interpolate(progress, [0, 1], [0, 360]);
\`\`\`

### Enter + exit
\`\`\`jsx
const frame = useCurrentFrame();
const { fps, durationInFrames } = useVideoConfig();
const enter = spring({ frame, fps });
const exit = spring({ frame, fps, delay: durationInFrames - fps, durationInFrames: fps });
const scale = enter - exit;
\`\`\`

## Easing
\`\`\`jsx
const value = interpolate(frame, [0, 100], [0, 1], {
  easing: Easing.inOut(Easing.quad), extrapolateLeft: "clamp", extrapolateRight: "clamp",
});
\`\`\`

Convexities: Easing.in, Easing.out, Easing.inOut
Curves: Easing.quad, Easing.sin, Easing.exp, Easing.circle
Bezier: Easing.bezier(0.8, 0.22, 0.96, 0.65)
`;
