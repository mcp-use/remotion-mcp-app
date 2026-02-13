import { MCPServer, text, widget } from "mcp-use/server";
import { z } from "zod";
import { RULE_INDEX } from "./rules/index.js";
import { RULE_SCENE_FORMAT } from "./rules/scene-format.js";
import { RULE_TEXT_ELEMENTS } from "./rules/text-elements.js";
import { RULE_SHAPE_ELEMENTS } from "./rules/shape-elements.js";
import { RULE_IMAGE_ELEMENTS } from "./rules/image-elements.js";
import { RULE_ANIMATIONS } from "./rules/animations.js";
import { RULE_TRANSITIONS } from "./rules/transitions.js";
import { RULE_TIMING } from "./rules/timing.js";
import { RULE_EXAMPLES } from "./rules/examples.js";
import { RULE_REACT_CODE } from "./rules/react-code.js";

const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;

const server = new MCPServer({
  name: "remotion-mcp",
  title: "Remotion Video Creator",
  version: "1.0.0",
  description:
    "Create animated video compositions with Remotion. Design multi-scene videos with text, shapes, images, animations, and transitions - all through conversation.",
  host: process.env.HOST ?? "0.0.0.0",
  baseUrl: process.env.MCP_URL ?? `http://localhost:${port}`,
});

// --- Rule tools (skill-style routing) ---

server.tool(
  {
    name: "read_me",
    description:
      "IMPORTANT: Call this FIRST before creating any composition. Returns the format guide overview and lists available rule tools for specific topics (animations, transitions, text, shapes, images, timing, examples).",
  },
  async () => text(RULE_INDEX)
);

server.tool(
  { name: "rule_scene_format", description: "Scene structure, backgrounds (solid/gradient), element positioning" },
  async () => text(RULE_SCENE_FORMAT)
);

server.tool(
  { name: "rule_text_elements", description: "Text element properties: fontSize, fontWeight, color, fontFamily, textAlign, lineHeight, backgroundColor" },
  async () => text(RULE_TEXT_ELEMENTS)
);

server.tool(
  { name: "rule_shape_elements", description: "Shape types (rectangle, circle, ellipse, line), fill, stroke, borderRadius, shadow" },
  async () => text(RULE_SHAPE_ELEMENTS)
);

server.tool(
  { name: "rule_image_elements", description: "Image src, objectFit, borderRadius, allowed domains" },
  async () => text(RULE_IMAGE_ELEMENTS)
);

server.tool(
  { name: "rule_animations", description: "Enter/exit animations: fade, slide, scale, spring, bounce, rotate, blur, typewriter + spring config presets" },
  async () => text(RULE_ANIMATIONS)
);

server.tool(
  { name: "rule_transitions", description: "Scene-to-scene transitions: fade, slide, wipe, flip, clockWipe + duration calculation" },
  async () => text(RULE_TRANSITIONS)
);

server.tool(
  { name: "rule_timing", description: "FPS guide, duration in frames, scene/animation timing, staggered entrances" },
  async () => text(RULE_TIMING)
);

server.tool(
  { name: "rule_examples", description: "Full working examples, color palettes, common patterns (title card, slide deck, kinetic typography)" },
  async () => text(RULE_EXAMPLES)
);

server.tool(
  { name: "rule_react_code", description: "React.createElement API reference for create_video: available Remotion imports, code structure, examples" },
  async () => text(RULE_REACT_CODE)
);

// --- Composition tool (JSON mode) ---

const compositionSchema = z.object({
  title: z.string().describe("Title of the composition"),
  width: z
    .number()
    .optional()
    .default(1920)
    .describe("Canvas width in pixels (default: 1920)"),
  height: z
    .number()
    .optional()
    .default(1080)
    .describe("Canvas height in pixels (default: 1080)"),
  fps: z
    .number()
    .optional()
    .default(30)
    .describe("Frames per second (default: 30)"),
  scenes: z
    .any()
    .describe(
      'Scenes as a JSON array. Each scene: { id, durationInFrames, background, elements, transition? }. Can be a JSON string or array. Use \\n for newlines in text, not literal newlines. Call read_me first.'
    ),
});

// @ts-expect-error - Zod v4 type depth issue with mcp-use generics
server.tool(
  {
    name: "create_composition",
    description:
      "Create or update a Remotion video composition. Renders as a live interactive video player. Call read_me first, then call specific rule tools as needed to learn the format.",
    schema: compositionSchema,
    widget: {
      name: "remotion-player",
      invoking: "Creating video composition...",
      invoked: "Video composition ready",
    },
  },
  async (params: z.infer<typeof compositionSchema>) => {
    const { title, width, height, fps, scenes } = params;

    // Normalize scenes: accept string, array, or object
    let parsedScenes;
    if (Array.isArray(scenes)) {
      parsedScenes = scenes;
    } else if (typeof scenes === "string") {
      try {
        parsedScenes = JSON.parse(scenes);
      } catch (e) {
        return text(
          `Error parsing scenes JSON: ${(e as Error).message}\n\nMake sure scenes is a valid JSON array. Use \\n for newlines in text content, not literal line breaks.`
        );
      }
    } else if (typeof scenes === "object" && scenes !== null) {
      // Single scene object or unexpected shape — wrap in array
      parsedScenes = [scenes];
    } else {
      return text("Error: scenes must be a JSON array of scene objects.");
    }

    if (!Array.isArray(parsedScenes) || parsedScenes.length === 0) {
      return text("Error: scenes must be a non-empty array.");
    }

    for (let i = 0; i < parsedScenes.length; i++) {
      const scene = parsedScenes[i];
      if (!scene.id || !scene.durationInFrames || !scene.background) {
        return text(
          `Error: Scene ${i} missing required fields. Every scene needs: id (string), durationInFrames (number), background ({ type: "solid"|"gradient", color/colors }). Got: ${JSON.stringify(Object.keys(scene))}`
        );
      }
    }

    const composition = JSON.stringify({
      meta: { title, width, height, fps },
      scenes: parsedScenes,
    });

    let totalFrames = 0;
    for (let i = 0; i < parsedScenes.length; i++) {
      totalFrames += parsedScenes[i].durationInFrames || 0;
      if (i < parsedScenes.length - 1 && parsedScenes[i].transition) {
        totalFrames -= parsedScenes[i].transition.durationInFrames || 0;
      }
    }
    const totalSeconds = (totalFrames / fps).toFixed(1);

    return widget({
      props: { composition },
      output: text(
        `Created composition "${title}" (${width}x${height}, ${fps}fps, ${parsedScenes.length} scene(s), ~${totalSeconds}s).\n` +
          `The video is now playing in the widget with full playback controls.\n` +
          `To iterate: call create_composition again with modified scenes.`
      ),
    });
  }
);

// --- Video tool (React code mode) ---

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
      "More flexible than create_composition. Call read_me then rule_react_code first.",
    schema: videoSchema,
    widget: {
      name: "remotion-player",
      invoking: "Compiling video...",
      invoked: "Video ready",
    },
  },
  // @ts-expect-error - Zod v4 type depth issue
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
