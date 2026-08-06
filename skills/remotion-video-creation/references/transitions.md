# Scene Transitions

Use `TransitionSeries` from `@remotion/transitions` when scenes should overlap through a presentation.

```tsx
import {TransitionSeries, linearTiming} from "@remotion/transitions";
import {fade} from "@remotion/transitions/fade";

<TransitionSeries>
  <TransitionSeries.Sequence durationInFrames={75}>
    <SceneA />
  </TransitionSeries.Sequence>
  <TransitionSeries.Transition
    presentation={fade()}
    timing={linearTiming({durationInFrames: 15})}
  />
  <TransitionSeries.Sequence durationInFrames={75}>
    <SceneB />
  </TransitionSeries.Sequence>
</TransitionSeries>
```

Installed presentations include the package's supported fade, slide, wipe, flip, clock-wipe, and iris-style entry points. Do not invent presentation imports.

The transition overlaps neighboring scenes, so total duration is the sum of scene durations minus transition durations. Keep transitions shorter than both adjacent scenes and choose a direction that supports the composition rather than adding motion arbitrarily.
