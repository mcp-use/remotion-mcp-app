export const RULE_INDEX = `# Remotion MCP — Video Creation Guide

Create videos using React component code with full Remotion API access.

## Available Rules

Call these tools to learn specific Remotion topics:

- **rule_react_code** - React.createElement API, available imports, code structure
- **rule_remotion_animations** - useCurrentFrame, frame-driven animations
- **rule_remotion_timing** - interpolate, spring, Easing, spring configs
- **rule_remotion_sequencing** - Sequence, delay, nested timing
- **rule_remotion_transitions** - TransitionSeries, fade, slide, wipe, flip
- **rule_remotion_text_animations** - Typewriter effect, word highlighting
- **rule_remotion_trimming** - Trim start/end of animations with Sequence

## Quick Start

1. Call **rule_react_code** for the code API reference
2. Call any specific rule for the topic you need
3. Call **create_video** with your React component code

## Important Rules

1. Use React.createElement, NOT JSX
2. Code must be valid JavaScript (not TypeScript)
3. Hooks (useCurrentFrame, useState, etc.) must be called at the top level
4. Must return a React element
5. DO NOT use CSS transitions/animations — only Remotion frame-based animations
6. durationInFrames is set in the tool parameters, not in the code
`;
