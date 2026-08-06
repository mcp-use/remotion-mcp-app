---
name: remotion-video-creation
description: Create and revise polished React and Remotion videos through the Remotion MCP create_video tool. Use for designing, animating, previewing, or iteratively editing a video composition.
---

# Remotion Video Creation

Build a multi-file React and Remotion project, then render it with the `create_video` tool.

## Workflow

1. Read [React project structure](references/react-code.md) before the first `create_video` call.
2. Read only the references relevant to the requested work:
   - [Animations](references/animations.md) for frame-driven motion.
   - [Timing](references/timing.md) for interpolation, springs, and easing.
   - [Sequencing](references/sequencing.md) for scenes and local timelines.
   - [Transitions](references/transitions.md) for transitions between scenes.
   - [Text animation](references/text-animations.md) for type and word effects.
   - [Trimming](references/trimming.md) for cutting animation ranges.
3. Design a coherent video with intentional pacing, hierarchy, and motion.
4. Call `create_video` with `files: JSON.stringify({...})` plus any required metadata.
5. Inspect the rendered preview and fix compilation or visual issues.
6. For follow-up edits, send only changed files. Preserve unrelated scenes and styles.

## Requirements

- Drive animation with Remotion frames. Never use CSS animations, CSS transitions, or `@keyframes`.
- Export a default React component from the entry file.
- Give every `Sequence` an explicit `durationInFrames`.
- Use installed packages only. The reliable imports are `remotion` and `@remotion/transitions`.
- Keep tool-level width, height, fps, and duration as fallback metadata.
- Unless the user requests a minimal result, prefer a multi-scene composition with clear typography and purposeful motion.
- Treat edits as patches to the existing project unless the user asks for a redesign.
