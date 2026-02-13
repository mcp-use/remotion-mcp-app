export const RULE_INDEX = `# Remotion MCP — Video Creation Guide

Two modes:
1. **JSON mode** (create_composition) — Define scenes as JSON. Simpler, supports streaming preview.
2. **Code mode** (create_video) — Write React component code. Full Remotion API access.

## Available Rules

- **rule_scene_format** - Scene structure, backgrounds, element positioning (JSON mode)
- **rule_text_elements** - Text properties (JSON mode)
- **rule_shape_elements** - Shape types, fill, stroke (JSON mode)
- **rule_image_elements** - Image src, objectFit (JSON mode)
- **rule_animations** - Enter/exit animations, spring configs (JSON mode)
- **rule_transitions** - Scene transitions, duration calculation (JSON mode)
- **rule_timing** - FPS guide, duration patterns (both modes)
- **rule_examples** - Full working examples, color palettes (JSON mode)
- **rule_react_code** - React.createElement API reference, all available imports, examples (Code mode)

## Quick Start — JSON Mode
1. Call **rule_scene_format** + **rule_animations**
2. Call **create_composition** with scenes array

## Quick Start — Code Mode
1. Call **rule_react_code** for the API reference
2. Call **create_video** with React component code

## Important Rules
1. Every scene needs unique "id", durationInFrames, background (JSON mode)
2. DO NOT use CSS transitions/animations — only Remotion frame-based animations
3. Use \\n for newlines in text, never literal line breaks inside JSON strings
4. Transition directions: "from-left", "from-right", "from-top", "from-bottom"
5. Code mode: use React.createElement, NOT JSX
`;
