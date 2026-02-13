import { MCPServer, text, widget } from "mcp-use/server";
import { z } from "zod";
import { RULE_INDEX } from "./rules/index.js";
import { RULE_REACT_CODE } from "./rules/react-code.js";
import { RULE_REMOTION_ANIMATIONS } from "./rules/remotion-animations.js";
import { RULE_REMOTION_TIMING } from "./rules/remotion-timing.js";
import { RULE_REMOTION_SEQUENCING } from "./rules/remotion-sequencing.js";
import { RULE_REMOTION_TRANSITIONS } from "./rules/remotion-transitions.js";
import { RULE_REMOTION_TEXT_ANIMATIONS } from "./rules/remotion-text-animations.js";
import { RULE_REMOTION_TRIMMING } from "./rules/remotion-trimming.js";

const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;

const server = new MCPServer({
  name: "remotion-mcp",
  title: "Remotion Video Creator",
  version: "1.0.0",
  description:
    "Create animated videos with Remotion using React component code. Full access to interpolate, spring, Sequence, TransitionSeries, and more.",
  host: process.env.HOST ?? "0.0.0.0",
  baseUrl: process.env.MCP_URL ?? `http://localhost:${port}`,
});

// --- Rule tools ---

server.tool(
  { name: "read_me", description: "IMPORTANT: Call this FIRST. Returns the guide overview and lists all available rule tools." },
  async () => text(RULE_INDEX)
);

server.tool(
  { name: "rule_react_code", description: "React.createElement API reference: available imports, code structure, examples" },
  async () => text(RULE_REACT_CODE)
);

server.tool(
  { name: "rule_remotion_animations", description: "Remotion animations: useCurrentFrame, frame-driven animation fundamentals" },
  async () => text(RULE_REMOTION_ANIMATIONS)
);

server.tool(
  { name: "rule_remotion_timing", description: "Remotion timing: interpolate, spring, Easing, spring configs, delay, duration" },
  async () => text(RULE_REMOTION_TIMING)
);

server.tool(
  { name: "rule_remotion_sequencing", description: "Remotion sequencing: Sequence, delay, nested timing, local frames" },
  async () => text(RULE_REMOTION_SEQUENCING)
);

server.tool(
  { name: "rule_remotion_transitions", description: "Remotion transitions: TransitionSeries, fade, slide, wipe, flip, duration calculation" },
  async () => text(RULE_REMOTION_TRANSITIONS)
);

server.tool(
  { name: "rule_remotion_text_animations", description: "Remotion text: typewriter effect, word highlighting, string slicing" },
  async () => text(RULE_REMOTION_TEXT_ANIMATIONS)
);

server.tool(
  { name: "rule_remotion_trimming", description: "Remotion trimming: cut start/end of animations with negative Sequence from" },
  async () => text(RULE_REMOTION_TRIMMING)
);

// --- Video tool ---

const videoSchema = z.object({
  title: z.string().describe("Title of the video"),
  width: z.number().optional().default(1920).describe("Canvas width (default: 1920)"),
  height: z.number().optional().default(1080).describe("Canvas height (default: 1080)"),
  fps: z.number().optional().default(30).describe("Frames per second (default: 30)"),
  durationInFrames: z.number().describe("Total duration in frames (e.g. 150 = 5s at 30fps)"),
  code: z.string().describe(
    "React component function body using React.createElement (no JSX). " +
    "Available: React, useState, useMemo, useCurrentFrame, useVideoConfig, interpolate, spring, Easing, " +
    "AbsoluteFill, Sequence, Img, TransitionSeries, linearTiming, fade, slide, wipe, flip. " +
    "Must return a React element. Call rule_react_code first."
  ),
});

// @ts-expect-error - Zod v4 type depth
server.tool(
  {
    name: "create_video",
    description:
      "Create a video using React component code with full Remotion API access. " +
      "Call read_me first, then rule tools as needed.",
    schema: videoSchema,
    widget: {
      name: "remotion-player",
      invoking: "Compiling video...",
      invoked: "Video ready",
    },
  },
  async (params: z.infer<typeof videoSchema>) => {
    const { title, width, height, fps, durationInFrames, code } = params;

    if (!code || code.trim().length === 0) {
      return text("Error: code must be a non-empty string containing a React component body.");
    }
    if (!durationInFrames || durationInFrames <= 0) {
      return text("Error: durationInFrames must be a positive number (e.g. 150 = 5s at 30fps).");
    }

    const videoData = JSON.stringify({
      meta: { title, width, height, fps, durationInFrames },
      code,
    });

    return widget({
      props: { videoCode: videoData },
      output: text(
        `Created video "${title}" (${width}x${height}, ${fps}fps, ${durationInFrames} frames, ~${(durationInFrames / fps).toFixed(1)}s).\n` +
        `The video is playing in the widget.\n` +
        `To iterate: call create_video again with modified code.`
      ),
    });
  }
);

await server.listen(port);
