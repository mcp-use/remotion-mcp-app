export const RULE_REMOTION_TRIMMING = `# Remotion Trimming — cut start or end

## Trim the beginning
Negative "from" on Sequence skips the first N frames:
\`\`\`
var { fps } = useVideoConfig();
return React.createElement(Sequence, { from: -0.5 * fps },
  React.createElement(MyContent, null)
);
\`\`\`

## Trim the end
durationInFrames unmounts after N frames:
\`\`\`
return React.createElement(Sequence, { durationInFrames: 1.5 * fps },
  React.createElement(MyContent, null)
);
\`\`\`

## Trim and delay
Nest sequences: outer delays, inner trims:
\`\`\`
return React.createElement(Sequence, { from: 30 },
  React.createElement(Sequence, { from: -15 },
    React.createElement(MyContent, null)
  )
);
\`\`\`
`;
