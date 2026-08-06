# Sequencing and Scenes

Use `Sequence`, `Series`, or `TransitionSeries` to define explicit scene timelines.

```tsx
<Sequence from={0} durationInFrames={60}>
  <Intro />
</Sequence>
<Sequence from={60} durationInFrames={90}>
  <Feature />
</Sequence>
```

Inside a `Sequence`, `useCurrentFrame()` is local and begins at zero. This makes scene components reusable and keeps their timing understandable.

- Always provide `durationInFrames` on `Sequence`.
- Use `Series` for adjacent scenes that do not overlap.
- Use nested sequences for delayed elements within a scene.
- Make total composition duration agree with the timeline.
- Avoid mounting every scene for the full composition because that creates visual stacking and unnecessary work.
