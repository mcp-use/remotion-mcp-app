# React Project Structure

## Tool contract

`create_video` requires `files`, a JSON string whose decoded value maps absolute project paths to source code.

```json
{
  "files": "{\"/src/Video.tsx\":\"import {AbsoluteFill} from \\\"remotion\\\"; export default function Video(){return <AbsoluteFill />;}\"}",
  "durationInFrames": 150,
  "fps": 30
}
```

Optional fields are `entryFile` (default `/src/Video.tsx`), `title`, `durationInFrames`, `fps`, `width`, and `height`. Do not add wrapper keys such as `input`, `project`, `arguments`, `params`, or `payload`. Do not use legacy aliases such as `code`, `jsx`, `tsx`, `source`, `fileMap`, or `projectFiles`.

For follow-up edits, call `create_video` with only changed files. Previous files are retained.

## Imports

- Use normal imports from `remotion` 4.0.505, including `AbsoluteFill`, `Sequence`, `Series`, `Audio`, `Video`, `OffthreadVideo`, `Solid`, `CanvasImage`, and `HtmlInCanvas`.
- Use `@remotion/transitions` 4.0.505 and its presentation entry points.
- Import files from the submitted file map with relative imports.
- Do not assume optional packages such as `@remotion/effects`, `@remotion/media`, `@remotion/captions`, `@remotion/gif`, `@remotion/lottie`, or `@remotion/three` are installed.

## Entry file

The entry file must default-export a React component:

```tsx
import {AbsoluteFill, interpolate, useCurrentFrame} from "remotion";

export default function Video() {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={{backgroundColor: "#0a0a0a", justifyContent: "center", alignItems: "center"}}>
      <div style={{color: "white", fontSize: 72, opacity}}>Hello World</div>
    </AbsoluteFill>
  );
}
```

It may export `calculateMetadata()` to derive width, height, fps, or duration from props. Keep valid positive fallback values in the tool arguments.

## Multi-file projects

Use small components and relative imports for substantial compositions:

```tsx
// /src/Video.tsx
import {AbsoluteFill} from "remotion";
import {Title} from "./components/Title";

export default function Video({title}) {
  return <AbsoluteFill><Title text={title} /></AbsoluteFill>;
}

// /src/components/Title.tsx
export function Title({text}) {
  return <div style={{color: "white", fontSize: 72}}>{text}</div>;
}
```

Use `OffthreadVideo` for render-oriented video playback. Use `Series` or `TransitionSeries` for sequential scenes. Every `Sequence` must have `durationInFrames` so scenes do not overlap unintentionally.

## Quality bar

Unless asked for minimal output, use at least three scenes, one intentional transition, multiple animated properties per scene, and a clear text hierarchy. Avoid static centered placeholder slides. For modification requests, preserve the existing structure and change only what was requested.
