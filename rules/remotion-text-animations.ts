export const RULE_REMOTION_TEXT_ANIMATIONS = `# Remotion Text Animations

## Typewriter effect
Use string slicing driven by useCurrentFrame(). Never use per-character opacity.

\`\`\`
var frame = useCurrentFrame();
var { fps } = useVideoConfig();
var FULL_TEXT = "From prompt to motion graphics. This is Remotion.";
var CHAR_FRAMES = 2;

var typedChars = Math.min(FULL_TEXT.length, Math.floor(frame / CHAR_FRAMES));
var typedText = FULL_TEXT.slice(0, typedChars);

// Blinking cursor
var cursorOpacity = interpolate(frame % 16, [0, 8, 16], [1, 0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

return React.createElement(AbsoluteFill, { style: { backgroundColor: "#fff", alignItems: "center", justifyContent: "center" } },
  React.createElement("div", { style: { color: "#000", fontSize: 72, fontWeight: 700, fontFamily: "sans-serif" } },
    React.createElement("span", null, typedText),
    React.createElement("span", { style: { opacity: cursorOpacity } }, "\\u258C")
  )
);
\`\`\`

## Word highlighting
Animate a highlight wipe behind a word using spring:

\`\`\`
var frame = useCurrentFrame();
var { fps } = useVideoConfig();
var scaleX = Math.min(1, spring({ fps: fps, frame: frame, config: { damping: 200 }, delay: 30, durationInFrames: 18 }));

return React.createElement(AbsoluteFill, { style: { backgroundColor: "#fff", alignItems: "center", justifyContent: "center" } },
  React.createElement("div", { style: { color: "#000", fontSize: 72, fontWeight: 700 } },
    React.createElement("span", null, "This is "),
    React.createElement("span", { style: { position: "relative", display: "inline-block" } },
      React.createElement("span", { style: { position: "absolute", left: 0, right: 0, top: "50%", height: "1.05em", transform: "translateY(-50%) scaleX(" + scaleX + ")", transformOrigin: "left center", backgroundColor: "#A7C7E7", borderRadius: "0.18em", zIndex: 0 } }),
      React.createElement("span", { style: { position: "relative", zIndex: 1 } }, "Remotion")
    ),
    React.createElement("span", null, ".")
  )
);
\`\`\`
`;
