# Text Animation

Animate text with frame-derived values. Do not use CSS keyframes.

For a typewriter effect, slice the source string using a clamped frame mapping:

```tsx
const visibleCharacters = Math.floor(interpolate(frame, [0, 40], [0, text.length], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
}));
return <div>{text.slice(0, visibleCharacters)}</div>;
```

For word highlighting, split the text once and compute each word's active range from the current frame. Keep the full text mounted when layout stability matters and animate color, opacity, weight, or a background marker.

Pair text motion with a strong hierarchy. Headlines, supporting copy, and accents should have distinct scale and timing. Avoid making every word move independently unless the requested style calls for it.
