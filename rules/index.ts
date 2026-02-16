export const RULE_INDEX = `# Remotion MCP — Project-Based Video Creation

Create videos using multi-file React/Remotion projects.

## Available Rules

Call these tools to learn specific Remotion topics:

- **rule_react_code** — Project file structure, imports, composition exports, props
- **rule_remotion_animations** — useCurrentFrame, frame-driven animations
- **rule_remotion_timing** — interpolate, spring, Easing, spring configs
- **rule_remotion_sequencing** — Sequence, durationInFrames, scene management
- **rule_remotion_transitions** — TransitionSeries, fade, slide, wipe, flip
- **rule_remotion_text_animations** — Typewriter effect, word highlighting
- **rule_remotion_trimming** — Trim start/end of animations with Sequence

## Quick Start

1. Call **rule_react_code** for the project format reference and exact tool call shape
2. Build your project as a **files** map: { "/src/Video.tsx": "source code..." }
3. Set **entryFile** to the key in files that exports the default component (e.g. "/src/Video.tsx")
4. First call: use **create_video** with files + entryFile
5. Follow-up edits: use **update_video** with changed files/props/metadata

## Important Rules

1. Use standard module imports (remotion and installed @remotion/* packages are supported)
2. Entry module must export a default React component
3. You may export calculateMetadata() to derive duration/fps/dimensions from props
4. Keep video-level fallback metadata in tool params (width, height, fps, durationInFrames)
5. Every Sequence must include durationInFrames to avoid scene stacking
6. Do not use CSS animations/transitions for timing; use frame-driven Remotion APIs
7. Default quality bar unless user asks otherwise: multi-scene structure, animated transitions, clear typography hierarchy, and purposeful motion (not static slides)
8. Session-aware updates are in **update_video**: default mode is merge. Use updateMode="replace" for full replacement, deleteFiles to remove files, resetProject=true to clear session state
9. **create_video** always requires files; **update_video** can omit files only if session state already exists
10. For edit requests, patch the existing project and keep unrelated scenes/styles unless user asks for a full redesign
`;
