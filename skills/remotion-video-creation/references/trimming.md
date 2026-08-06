# Trimming Animations

Use a negative `from` value on `Sequence` to begin a child after its own initial frames have already elapsed.

```tsx
<Sequence from={-15} durationInFrames={75}>
  <AnimatedScene />
</Sequence>
```

The child sees frame 15 when the parent composition is at frame zero. Adjust `durationInFrames` so the intended visible range remains mounted.

To trim the end, shorten the sequence duration. For media, prefer the media component's trim options when available because they express source-media cuts directly. Keep composition duration consistent with the final visible timeline.
