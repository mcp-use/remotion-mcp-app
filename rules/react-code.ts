export const RULE_REACT_CODE = `# React Code API Reference (create_video)

The create_video tool accepts raw React component code as a string.
Write the function BODY only — it will be wrapped automatically.
Use React.createElement() for all elements (no JSX).

## Available Imports

These are available as local variables in your code:

### React
- React, useState, useMemo, useEffect, useCallback, useRef

### Remotion Core
- useCurrentFrame() — returns current frame number (starts at 0)
- useVideoConfig() — returns { width, height, fps, durationInFrames }
- interpolate(value, inputRange, outputRange, options?)
  - options: { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
- spring({ frame, fps, config? }) — returns 0 to 1
  - config: { damping?, stiffness?, mass? }
  - Presets: { damping: 200 } smooth, { damping: 12 } bouncy, { damping: 8 } very bouncy
- Easing — Easing.bezier(), Easing.inOut(Easing.quad), etc.

### Components
- AbsoluteFill — full-size positioned container
- Sequence — time-offset container (props: from, durationInFrames)
- Img — image component (props: src, style)

### Transitions
- TransitionSeries, TransitionSeries.Sequence, TransitionSeries.Transition
- linearTiming({ durationInFrames }), springTiming({ config })
- fade(), slide({ direction }), wipe({ direction }), flip({ direction })
- Directions: "from-left", "from-right", "from-top", "from-bottom"

## Code Structure

Your code is the BODY of a function. It must RETURN a React element.
Hooks must be called at the top level (not inside conditions/loops).

\`\`\`
const frame = useCurrentFrame();
const { fps } = useVideoConfig();
const opacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" });

return React.createElement(AbsoluteFill, { style: { backgroundColor: "#0a0a0a" } },
  React.createElement("div", {
    style: { color: "#fff", fontSize: 72, fontWeight: 700, textAlign: "center", position: "absolute", top: "40%", width: "100%", opacity }
  }, "Hello World")
);
\`\`\`

## React.createElement Patterns

### Basic element
React.createElement("div", { style: { color: "white" } }, "text")

### Nested elements
React.createElement("div", null,
  React.createElement("h1", null, "Title"),
  React.createElement("p", null, "Subtitle")
)

### Sequence (timed scenes)
React.createElement(AbsoluteFill, null,
  React.createElement(Sequence, { from: 0, durationInFrames: 60 },
    React.createElement(AbsoluteFill, { style: { backgroundColor: "#667eea" } },
      React.createElement("div", { style: { color: "#fff", fontSize: 48 } }, "Scene 1")
    )
  ),
  React.createElement(Sequence, { from: 60, durationInFrames: 60 },
    React.createElement(AbsoluteFill, { style: { backgroundColor: "#764ba2" } },
      React.createElement("div", { style: { color: "#fff", fontSize: 48 } }, "Scene 2")
    )
  )
)

### Transitions between scenes
return React.createElement(TransitionSeries, null,
  React.createElement(TransitionSeries.Sequence, { durationInFrames: 60 },
    React.createElement(AbsoluteFill, { style: { backgroundColor: "#667eea" } },
      React.createElement("div", { style: { color: "#fff", fontSize: 48 } }, "Scene 1")
    )
  ),
  React.createElement(TransitionSeries.Transition, {
    presentation: fade(), timing: linearTiming({ durationInFrames: 15 })
  }),
  React.createElement(TransitionSeries.Sequence, { durationInFrames: 60 },
    React.createElement(AbsoluteFill, { style: { backgroundColor: "#764ba2" } },
      React.createElement("div", { style: { color: "#fff", fontSize: 48 } }, "Scene 2")
    )
  )
);

### Spring animation
const frame = useCurrentFrame();
const { fps } = useVideoConfig();
const scale = spring({ frame, fps, config: { damping: 12 } });

return React.createElement(AbsoluteFill, { style: { backgroundColor: "#0a0a0a", display: "flex", justifyContent: "center", alignItems: "center" } },
  React.createElement("div", {
    style: { color: "#fff", fontSize: 80, transform: "scale(" + scale + ")", transformOrigin: "center" }
  }, "Bouncy!")
);

### Staggered entrance
const frame = useCurrentFrame();
const { fps } = useVideoConfig();
var items = ["Fast", "Secure", "Simple"];
var elements = items.map(function(item, i) {
  var s = spring({ frame: frame - i * 10, fps: fps, config: { damping: 12 } });
  var y = interpolate(s, [0, 1], [50, 0]);
  return React.createElement("div", {
    key: i,
    style: { color: "#fff", fontSize: 48, opacity: s, transform: "translateY(" + y + "px)" }
  }, item);
});

return React.createElement(AbsoluteFill, {
  style: { backgroundColor: "#1a1a2e", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 20 }
}, elements);

### Image with animation
const frame = useCurrentFrame();
const opacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

return React.createElement(AbsoluteFill, { style: { backgroundColor: "#000" } },
  React.createElement(Img, {
    src: "https://picsum.photos/1920/1080",
    style: { width: "100%", height: "100%", objectFit: "cover", opacity: opacity }
  })
);

## Important Rules

1. Must return a React element
2. Hooks at the top level only — not inside if/for/map callbacks
3. Use React.createElement, NOT JSX
4. Code must be valid JavaScript (not TypeScript)
5. Use string concatenation for dynamic styles (not template literals with backticks)
6. durationInFrames is set in the tool parameters, not in the code
7. Use var instead of const/let inside map callbacks for broader compatibility
`;
