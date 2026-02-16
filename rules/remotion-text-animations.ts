export const RULE_REMOTION_TEXT_ANIMATIONS = `# Remotion Text Animations

## Typewriter effect
Use string slicing driven by useCurrentFrame(). Never use per-character opacity.

\`\`\`jsx
const frame = useCurrentFrame();
const FULL_TEXT = "From prompt to motion graphics. This is Remotion.";
const CHAR_FRAMES = 2;

const typedChars = Math.min(FULL_TEXT.length, Math.floor(frame / CHAR_FRAMES));
const typedText = FULL_TEXT.slice(0, typedChars);

// Blinking cursor
const cursorOpacity = interpolate(frame % 16, [0, 8, 16], [1, 0, 1], {
  extrapolateLeft: "clamp", extrapolateRight: "clamp",
});

return (
  <AbsoluteFill style={{ backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
    <div style={{ color: "#000", fontSize: 72, fontWeight: 700, fontFamily: "sans-serif" }}>
      <span>{typedText}</span>
      <span style={{ opacity: cursorOpacity }}>{"\u258C"}</span>
    </div>
  </AbsoluteFill>
);
\`\`\`

## Word highlighting
Animate a highlight wipe behind a word using spring:

\`\`\`jsx
const frame = useCurrentFrame();
const { fps } = useVideoConfig();
const scaleX = Math.min(1, spring({ fps, frame, config: { damping: 200 }, delay: 30, durationInFrames: 18 }));

return (
  <AbsoluteFill style={{ backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
    <div style={{ color: "#000", fontSize: 72, fontWeight: 700 }}>
      <span>This is </span>
      <span style={{ position: "relative", display: "inline-block" }}>
        <span style={{
          position: "absolute", left: 0, right: 0, top: "50%",
          height: "1.05em", transform: \\\`translateY(-50%) scaleX(\${scaleX})\\\`,
          transformOrigin: "left center", backgroundColor: "#A7C7E7",
          borderRadius: "0.18em", zIndex: 0,
        }} />
        <span style={{ position: "relative", zIndex: 1 }}>Remotion</span>
      </span>
      <span>.</span>
    </div>
  </AbsoluteFill>
);
\`\`\`
`;
