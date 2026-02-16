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
  clearSessionProject,
  compileAndRespondWithProject,
  failProject,
  formatZodIssues,
  getSessionProject,
  resolveProjectInput,
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

const filesSchema = z
  .record(z.string(), z.string())
  .refine((value) => Object.keys(value).length > 0, "files must contain at least one file");

const projectVideoSchema = z.object({
  title: z.string().optional().default(DEFAULT_META.title).describe("Title shown in the video player"),
  compositionId: z.string().optional().default(DEFAULT_META.compositionId).describe("Composition identifier (default: Main)"),
  width: z.number().optional().default(DEFAULT_META.width).describe("Fallback composition width in pixels"),
  height: z.number().optional().default(DEFAULT_META.height).describe("Fallback composition height in pixels"),
  fps: z.number().optional().default(DEFAULT_META.fps).describe("Fallback frames per second"),
  durationInFrames: z.number().optional().default(DEFAULT_META.durationInFrames).describe("Fallback total duration in frames"),
  entryFile: z.string().optional().default("/src/Video.tsx").describe("Entry file path for the composition module"),
  files: filesSchema.describe(
    "Map of project files. Keys are virtual file paths, values are file contents. Supports relative imports between files and npm imports from installed packages."
  ),
  defaultProps: z
    .record(z.string(), z.unknown())
    .optional()
    .default({})
    .describe("Default props passed to the composition"),
  inputProps: z
    .record(z.string(), z.unknown())
    .optional()
    .default({})
    .describe("Current input props passed to the composition"),
});

const createVideoSchema = z.object({
  title: z.string().optional().describe("Title shown in the video player"),
  compositionId: z.string().optional().describe("Composition identifier (default: Main)"),
  width: z.number().optional().describe("Fallback composition width in pixels"),
  height: z.number().optional().describe("Fallback composition height in pixels"),
  fps: z.number().optional().describe("Fallback frames per second"),
  durationInFrames: z.number().optional().describe("Fallback total duration in frames"),
  entryFile: z.string().describe("Entry file path for the composition module"),
  files: filesSchema.describe(
    "Map of project files. Keys are virtual file paths, values are file contents. Supports relative imports between files and npm imports from installed packages."
  ),
  resetProject: z
    .boolean()
    .optional()
    .describe("If true, clears previous session project before applying this request."),
  defaultProps: z
    .record(z.string(), z.unknown())
    .optional()
    .describe("Default props passed to the composition"),
  inputProps: z
    .record(z.string(), z.unknown())
    .optional()
    .describe("Current input props passed to the composition"),
}).strict();

const updateVideoSchema = z.object({
  title: z.string().optional().describe("Title shown in the video player"),
  compositionId: z.string().optional().describe("Composition identifier (default: Main)"),
  width: z.number().optional().describe("Fallback composition width in pixels"),
  height: z.number().optional().describe("Fallback composition height in pixels"),
  fps: z.number().optional().describe("Fallback frames per second"),
  durationInFrames: z.number().optional().describe("Fallback total duration in frames"),
  entryFile: z.string().optional().describe("Entry file path for the composition module"),
  updateMode: z
    .enum(["merge", "replace"])
    .optional()
    .describe("How to apply incoming files against previous session state (default: merge)."),
  usePreviousProject: z
    .boolean()
    .optional()
    .describe("If true (default), reuse previous session project when fields/files are omitted."),
  deleteFiles: z
    .array(z.string())
    .optional()
    .describe("Optional list of file paths to delete from the previous session project."),
  resetProject: z
    .boolean()
    .optional()
    .describe("If true, clears previous session project before applying this request."),
  files: filesSchema
    .optional()
    .describe(
      "Map of project files. Keys are virtual file paths, values are file contents. Supports relative imports between files and npm imports from installed packages."
    ),
  defaultProps: z
    .record(z.string(), z.unknown())
    .optional()
    .describe("Default props passed to the composition"),
  inputProps: z
    .record(z.string(), z.unknown())
    .optional()
    .describe("Current input props passed to the composition"),
}).strict();

// @ts-expect-error - Zod v4 type depth
server.tool(
  {
    name: "create_video",
    description:
      "Create a Remotion video project from explicit files. " +
      "Requires `files` + `entryFile` and stores the project in session state for later edits via update_video.",
    schema: createVideoSchema,
    widget: {
      name: "remotion-player",
      invoking: "Compiling project...",
      invoked: "Video ready",
    },
  },
  async (rawParams: z.infer<typeof createVideoSchema>, ctx) => {
    const sessionId = ctx.session.sessionId;
    if (rawParams.resetProject) {
      clearSessionProject(sessionId);
    }

    const parseResult = projectVideoSchema.safeParse(rawParams);
    if (!parseResult.success) {
      return failProject(`Invalid input: ${formatZodIssues(parseResult.error)}`);
    }
    const parsedInput = parseResult.data;

    return compileAndRespondWithProject(parsedInput, sessionId, [], "update_video");
  }
);

// @ts-expect-error - Zod v4 type depth
server.tool(
  {
    name: "update_video",
    description:
      "Update the current session video project. " +
      "Can patch files/props/metadata and merge with previous session state.",
    schema: updateVideoSchema,
    widget: {
      name: "remotion-player",
      invoking: "Compiling project...",
      invoked: "Video ready",
    },
  },
  async (rawParams: z.infer<typeof updateVideoSchema>, ctx) => {
    const sessionId = ctx.session.sessionId;
    if (rawParams.resetProject) {
      clearSessionProject(sessionId);
    }
    const previousProject = getSessionProject(sessionId);

    const resolved = resolveProjectInput(rawParams, previousProject);
    const resolvedFiles = resolved.project.files;
    if (!resolvedFiles || Object.keys(resolvedFiles).length === 0) {
      return failProject(
        resolved.canReusePreviousProject
          ? "No project files available. Provide `files` on the first call or remove `resetProject`."
          : "No project files available. Provide `files` when usePreviousProject is false."
      );
    }

    const parseResult = projectVideoSchema.safeParse(resolved.project);
    if (!parseResult.success) {
      return failProject(`Invalid input: ${formatZodIssues(parseResult.error)}`);
    }

    const statusLines: string[] = [];
    if (resolved.usedPreviousProject) {
      statusLines.push(`Reused previous session project (mode: ${resolved.updateMode}).`);
    }
    if (resolved.deletedFiles > 0) {
      statusLines.push(`Deleted ${resolved.deletedFiles} file(s) from prior state.`);
    }

    return compileAndRespondWithProject(parseResult.data, sessionId, statusLines, "update_video");
  }
);

await server.listen(port);
