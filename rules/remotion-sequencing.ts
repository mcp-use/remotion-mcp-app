export const RULE_REMOTION_SEQUENCING = `# Remotion Sequencing — Sequence, durationInFrames

## CRITICAL: Always set durationInFrames on Sequence

Sequence uses absolute positioning (AbsoluteFill) by default.
Without durationInFrames, scenes STACK ON TOP OF EACH OTHER and never unmount.

### WRONG — all scenes visible at once, overlapping:
\`\`\`jsx
<Sequence from={0}><Scene1 /></Sequence>
<Sequence from={60}><Scene2 /></Sequence>
\`\`\`

### CORRECT — each scene appears then disappears:
\`\`\`jsx
<Sequence from={0} durationInFrames={60}><Scene1 /></Sequence>
<Sequence from={60} durationInFrames={60}><Scene2 /></Sequence>
\`\`\`

## Full example
\`\`\`jsx
const { fps } = useVideoConfig();

return (
  <AbsoluteFill style={{ backgroundColor: "#0a0a0a" }}>
    <Sequence from={0} durationInFrames={2 * fps}>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ color: "#fff", fontSize: 48 }}>First Scene</div>
      </AbsoluteFill>
    </Sequence>
    <Sequence from={2 * fps} durationInFrames={2 * fps}>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ color: "#fff", fontSize: 48 }}>Second Scene</div>
      </AbsoluteFill>
    </Sequence>
  </AbsoluteFill>
);
\`\`\`

## layout="none" — for overlays within one scene
Use layout="none" ONLY when you want elements to layer on purpose
(e.g. a subtitle on top of a background). It removes the AbsoluteFill wrapper.
\`\`\`jsx
<Sequence from={0} durationInFrames={120}>
  <AbsoluteFill style={{ backgroundColor: "#000" }}>
    <div style={{ color: "#fff", fontSize: 72 }}>Main Title</div>
  </AbsoluteFill>
</Sequence>
<Sequence from={30} durationInFrames={90} layout="none">
  <div style={{ position: "absolute", bottom: 40, width: "100%", textAlign: "center", color: "#aaa" }}>
    Subtitle overlay
  </div>
</Sequence>
\`\`\`

## Frame references inside Sequence
useCurrentFrame() returns the LOCAL frame (starts at 0 inside each Sequence, not the global position).

## Nested Sequences
\`\`\`jsx
return (
  <Sequence from={0} durationInFrames={120}>
    <AbsoluteFill style={{ backgroundColor: "#000" }} />
    <Sequence from={15} durationInFrames={90} layout="none">
      <div style={{ color: "#fff", position: "absolute", top: "30%", width: "100%", textAlign: "center", fontSize: 64 }}>Title</div>
    </Sequence>
    <Sequence from={45} durationInFrames={60} layout="none">
      <div style={{ color: "#aaa", position: "absolute", top: "55%", width: "100%", textAlign: "center", fontSize: 32 }}>Subtitle</div>
    </Sequence>
  </Sequence>
);
\`\`\`
`;
