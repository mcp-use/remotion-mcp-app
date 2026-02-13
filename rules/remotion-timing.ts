export const RULE_REMOTION_TIMING = `# Remotion Timing — interpolate, spring, Easing

## interpolate
Maps a value from one range to another.
\`\`\`
var opacity = interpolate(frame, [0, 100], [0, 1]);
\`\`\`

Clamping (recommended):
\`\`\`
var opacity = interpolate(frame, [0, 100], [0, 1], {
  extrapolateRight: "clamp", extrapolateLeft: "clamp",
});
\`\`\`

## spring
Physics-based animation. Goes from 0 to 1 with natural motion.
\`\`\`
var frame = useCurrentFrame();
var { fps } = useVideoConfig();
var scale = spring({ frame: frame, fps: fps });
\`\`\`

### Spring configs
- Default: { mass: 1, damping: 10, stiffness: 100 } (slight bounce)
- Smooth: { damping: 200 }
- Snappy: { damping: 20, stiffness: 200 }
- Bouncy: { damping: 8 }
- Heavy: { damping: 15, stiffness: 80, mass: 2 }

### Delay
\`\`\`
var entrance = spring({ frame: frame, fps: fps, delay: 20 });
\`\`\`

### Fixed duration
\`\`\`
var s = spring({ frame: frame, fps: fps, durationInFrames: 40 });
\`\`\`

### Combining spring with interpolate
\`\`\`
var progress = spring({ frame: frame, fps: fps });
var rotation = interpolate(progress, [0, 1], [0, 360]);
\`\`\`

### Enter + exit
\`\`\`
var frame = useCurrentFrame();
var { fps, durationInFrames } = useVideoConfig();
var enter = spring({ frame: frame, fps: fps });
var exit = spring({ frame: frame, fps: fps, delay: durationInFrames - fps, durationInFrames: fps });
var scale = enter - exit;
\`\`\`

## Easing
\`\`\`
var value = interpolate(frame, [0, 100], [0, 1], {
  easing: Easing.inOut(Easing.quad), extrapolateLeft: "clamp", extrapolateRight: "clamp",
});
\`\`\`

Convexities: Easing.in, Easing.out, Easing.inOut
Curves: Easing.quad, Easing.sin, Easing.exp, Easing.circle
Bezier: Easing.bezier(0.8, 0.22, 0.96, 0.65)
`;
