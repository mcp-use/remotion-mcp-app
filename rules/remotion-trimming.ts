export const RULE_REMOTION_TRIMMING = `# Remotion Trimming — cut start or end

## Trim the beginning
Negative "from" on Sequence skips the first N frames:
\`\`\`jsx
const { fps } = useVideoConfig();
return (
  <Sequence from={-0.5 * fps} durationInFrames={2 * fps}>
    <MyContent />
  </Sequence>
);
\`\`\`

## Trim the end
durationInFrames unmounts after N frames:
\`\`\`jsx
return (
  <Sequence durationInFrames={1.5 * fps}>
    <MyContent />
  </Sequence>
);
\`\`\`

## Trim and delay
Nest sequences: outer delays, inner trims:
\`\`\`jsx
return (
  <Sequence from={30} durationInFrames={60}>
    <Sequence from={-15}>
      <MyContent />
    </Sequence>
  </Sequence>
);
\`\`\`
`;
