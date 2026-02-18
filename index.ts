import { MCPServer, text } from "mcp-use/server";
import { z } from "zod";
import { RULE_INDEX } from "./rules/index.js";
import { RULE_REACT_CODE } from "./rules/react-code.js";
import { RULE_REMOTION_ANIMATIONS } from "./rules/remotion-animations.js";
import { RULE_REMOTION_TIMING } from "./rules/remotion-timing.js";
import { RULE_REMOTION_SEQUENCING } from "./rules/remotion-sequencing.js";
import { RULE_REMOTION_TRANSITIONS } from "./rules/remotion-transitions.js";
import { RULE_REMOTION_TEXT_ANIMATIONS } from "./rules/remotion-text-animations.js";
import { RULE_REMOTION_TRIMMING } from "./rules/remotion-trimming.js";
import {
  DEFAULT_META,
  compileAndRespondWithProject,
  failProject,
  formatZodIssues,
  getSessionProject,
} from "./utils.js";

const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;

const server = new MCPServer({
  name: "remotion-mcp",
  title: "Remotion Video Creator",
  version: "2.0.0",
  description:
    "Create Remotion videos from multi-file React projects with props-first composition design.",
  host: process.env.HOST ?? "0.0.0.0",
  baseUrl: process.env.MCP_URL ?? `http://localhost:${port}`,
});

// --- Rule tools ---

server.tool(
  { name: "read_me", description: "IMPORTANT: Call this FIRST. Returns the guide overview and lists all available rule tools." },
  async () => text(RULE_INDEX)
);

server.tool(
  { name: "rule_react_code", description: "Project code reference: file structure, supported imports, component/props patterns" },
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

const projectVideoSchema = z.object({
  title: z.string().optional().default(DEFAULT_META.title),
  compositionId: z.string().optional().default(DEFAULT_META.compositionId),
  width: z.number().optional().default(DEFAULT_META.width),
  height: z.number().optional().default(DEFAULT_META.height),
  fps: z.number().optional().default(DEFAULT_META.fps),
  durationInFrames: z.number().optional().default(DEFAULT_META.durationInFrames),
  entryFile: z.string().optional().default("/src/Video.tsx"),
  files: z.record(z.string(), z.string()),
  defaultProps: z.record(z.string(), z.unknown()).optional().default({}),
  inputProps: z.record(z.string(), z.unknown()).optional().default({}),
});

const createVideoSchema = z.object({
  files: z.string().describe(
    'REQUIRED. A JSON string of {path: code} mapping file paths to source code. Example: \'{"\/src\/Video.tsx":"import {AbsoluteFill} from \\"remotion\\";\\nexport default function Video(){return <AbsoluteFill\/>;}"}\'. For edits, only include changed files — unchanged files are kept from the previous call.'
  ),
  entryFile: z.string().optional().describe('Entry file path (default: "/src/Video.tsx"). Must match a key in files.'),
  title: z.string().optional().describe("Title shown in the video player"),
  durationInFrames: z.number().optional().describe("Total duration in frames (default: 150)"),
  fps: z.number().optional().describe("Frames per second (default: 30)"),
  width: z.number().optional().describe("Width in pixels (default: 1920)"),
  height: z.number().optional().describe("Height in pixels (default: 1080)"),
});

server.tool(
  {
    name: "create_video",
    description:
      "Create or update a video. The `files` param is a JSON string (not an object) mapping file paths to source code. " +
      'Pass it as: files: JSON.stringify({"/src/Video.tsx": "...your code..."}). ' +
      "For edits, only include changed files — previous files are preserved automatically.",
    schema: createVideoSchema as any,
    widget: {
      name: "remotion-player",
      invoking: "Compiling project...",
      invoked: "Video ready",
    },
  },
  async (rawParams: z.infer<typeof createVideoSchema>, ctx) => {
    const sessionId = ctx.session?.sessionId ?? "default";

    // Parse files from JSON string
    let files: Record<string, string>;
    try {
      const parsed = JSON.parse(rawParams.files);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return failProject('files must be a JSON object like {"\/src\/Video.tsx": "...code..."}');
      }
      files = parsed as Record<string, string>;
    } catch {
      return failProject('files must be a valid JSON string, e.g. \'{"\/src\/Video.tsx":"...code..."}\'');
    }

    if (Object.keys(files).length === 0) {
      return failProject('files must contain at least one file entry.');
    }

    // Merge with previous session state (if any)
    const previous = getSessionProject(sessionId);
    const mergedFiles = previous
      ? { ...previous.files, ...files }
      : files;

    const project = {
      title: rawParams.title ?? previous?.title,
      compositionId: previous?.compositionId,
      width: rawParams.width ?? previous?.width,
      height: rawParams.height ?? previous?.height,
      fps: rawParams.fps ?? previous?.fps,
      durationInFrames: rawParams.durationInFrames ?? previous?.durationInFrames,
      entryFile: rawParams.entryFile ?? previous?.entryFile,
      files: mergedFiles,
      defaultProps: previous?.defaultProps,
      inputProps: previous?.inputProps,
    };

    const parseResult = projectVideoSchema.safeParse(project);
    if (!parseResult.success) {
      return failProject(`Invalid input: ${formatZodIssues(parseResult.error)}`);
    }

    const statusLines: string[] = [];
    if (previous) {
      statusLines.push("Merged with previous project.");
    }

    return compileAndRespondWithProject(parseResult.data, sessionId, statusLines, "create_video");
  }
);

server.get("/.well-known/openai-apps", (c) => {
  return c.text("gPONHvOywqzsT3-iJ5is_xR6HysaW9Gbls7TeneGI8M");
});

await server.listen(port);
