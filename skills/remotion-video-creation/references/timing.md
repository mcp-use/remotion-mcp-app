# Timing, Springs, and Easing

Use `interpolate()` for deterministic mappings and `spring()` for natural motion.

```tsx
const frame = useCurrentFrame();
const {fps} = useVideoConfig();

const progress = interpolate(frame, [0, 30], [0, 1], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
  easing: Easing.out(Easing.cubic),
});

const entrance = spring({
  frame,
  fps,
  config: {damping: 14, stiffness: 120, mass: 0.8},
});
```

Delay a spring by subtracting frames or with its `delay` option. Control its approximate duration with `durationInFrames`. Use restrained spring settings for typography and stronger overshoot only when it supports the visual direction.

For exit motion, map a later frame range back toward zero. Keep each scene's timing relative to its local timeline when it is nested inside `Sequence` or `Series`.
