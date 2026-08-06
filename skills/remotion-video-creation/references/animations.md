# Frame-driven Animations

All animation must be driven by `useCurrentFrame()`. CSS transitions and animations do not render reliably in Remotion.

```tsx
const frame = useCurrentFrame();
const {fps} = useVideoConfig();
const opacity = interpolate(frame, [0, 2 * fps], [0, 1], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
});
```

- `useCurrentFrame()` returns the current integer frame, starting at zero.
- `useVideoConfig()` returns width, height, fps, and duration.
- Express human timing in seconds multiplied by `fps`.
- Clamp both ends of interpolations unless extrapolation is intentional.
- Animate coordinated properties such as opacity, position, scale, blur, or rotation to create purposeful motion.
