import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { MCPServer } from "mcp-use";

const SKILL_NAME = "remotion-video-creation";
export const SKILL_URI = `skill://remotion-mcp/${SKILL_NAME}/SKILL.md`;
const EXTENSION_ID = "io.modelcontextprotocol/skills";

const SKILL_DESCRIPTION =
  "Create and revise polished React and Remotion videos through the Remotion MCP create_video tool. Use for designing, animating, previewing, or iteratively editing a video composition.";

const SKILL_FILES = [
  { path: "SKILL.md", mimeType: "text/markdown" },
  { path: "agents/openai.yaml", mimeType: "application/yaml" },
  { path: "references/react-code.md", mimeType: "text/markdown" },
  { path: "references/animations.md", mimeType: "text/markdown" },
  { path: "references/timing.md", mimeType: "text/markdown" },
  { path: "references/sequencing.md", mimeType: "text/markdown" },
  { path: "references/transitions.md", mimeType: "text/markdown" },
  { path: "references/text-animations.md", mimeType: "text/markdown" },
  { path: "references/trimming.md", mimeType: "text/markdown" },
] as const;

type JsonRpcId = string | number | null;

type SkillResource = {
  uri: string;
  name: string;
  mimeType: "text/markdown" | "application/yaml";
  digest: string;
  text: string;
};

type SkillEntry = {
  uri: string;
  frontmatter: {
    name: string;
    description: string;
  };
  resources: Array<Pick<SkillResource, "uri" | "digest">>;
};

function skillFileUri(relativePath: string): string {
  return `skill://remotion-mcp/${SKILL_NAME}/${relativePath}`;
}

function loadSkillResource(file: (typeof SKILL_FILES)[number]): SkillResource {
  const { path: relativePath, mimeType } = file;
  const filePath = resolve(process.cwd(), "skills", SKILL_NAME, relativePath);
  const text = readFileSync(filePath, "utf8");
  const digest = `sha256:${createHash("sha256").update(text, "utf8").digest("hex")}`;
  return {
    uri: skillFileUri(relativePath),
    name: `${SKILL_NAME}/${relativePath}`,
    mimeType,
    digest,
    text,
  };
}

const skillResources = SKILL_FILES.map(loadSkillResource);

export const remotionSkill: SkillEntry = {
  uri: SKILL_URI,
  frontmatter: {
    name: SKILL_NAME,
    description: SKILL_DESCRIPTION,
  },
  resources: skillResources.map(({ uri, digest }) => ({
    uri,
    digest,
  })),
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function jsonRpcResult(id: JsonRpcId, result: unknown): Response {
  return Response.json({ jsonrpc: "2.0", id, result });
}

function jsonRpcError(id: JsonRpcId, code: number, message: string): Response {
  return Response.json({
    jsonrpc: "2.0",
    id,
    error: { code, message },
  });
}

function addSkillsCapability(payload: unknown): unknown {
  if (Array.isArray(payload)) {
    return payload.map(addSkillsCapability);
  }
  if (!isRecord(payload) || !isRecord(payload.result)) {
    return payload;
  }

  const result = payload.result;
  if (!isRecord(result.capabilities)) {
    return payload;
  }

  const extensions = isRecord(result.capabilities.extensions)
    ? result.capabilities.extensions
    : {};

  return {
    ...payload,
    result: {
      ...result,
      capabilities: {
        ...result.capabilities,
        extensions: {
          ...extensions,
          [EXTENSION_ID]: {},
        },
      },
    },
  };
}

function rewriteServerSentEvents(body: string): string {
  return body
    .split("\n")
    .map((line) => {
      if (!line.startsWith("data:")) return line;
      const rawData = line.slice(5).trimStart();
      try {
        return `data: ${JSON.stringify(addSkillsCapability(JSON.parse(rawData)))}`;
      } catch {
        return line;
      }
    })
    .join("\n");
}

/**
 * Register the bounded SEP-2640 subset currently supported by OpenAI's MCP
 * skill importer. mcp-use exposes standard resources directly; the two draft
 * skill methods and initialize capability are added at the HTTP boundary.
 */
export function registerSkillExtension(server: MCPServer): void {
  for (const resource of skillResources) {
    server.resource(
      {
        name: resource.name,
        title: resource.name,
        uri: resource.uri,
        description: `Resource for the ${SKILL_NAME} MCP skill`,
        mimeType: resource.mimeType,
      },
      async () => ({
        contents: [
          {
            uri: resource.uri,
            mimeType: resource.mimeType,
            text: resource.text,
          },
        ],
      })
    );
  }

  server.use("/mcp", async (context, next) => {
    if (context.req.method !== "POST") {
      await next();
      return;
    }

    let requestBody: unknown;
    try {
      requestBody = await context.req.raw.clone().json();
    } catch {
      await next();
      return;
    }

    if (!isRecord(requestBody) || Array.isArray(requestBody)) {
      await next();
      return;
    }

    const method = requestBody.method;
    const id =
      typeof requestBody.id === "string" || typeof requestBody.id === "number" || requestBody.id === null
        ? requestBody.id
        : null;

    if (method === "skills/list") {
      const params = requestBody.params;
      if (params !== undefined && !isRecord(params)) {
        context.res = jsonRpcError(id, -32602, "skills/list params must be an object");
        return;
      }
      context.res = jsonRpcResult(id, { skills: [remotionSkill] });
      return;
    }

    if (method === "skills/get") {
      const params = requestBody.params;
      if (!isRecord(params) || params.uri !== SKILL_URI) {
        context.res = jsonRpcError(id, -32602, `Unknown skill URI. Expected ${SKILL_URI}`);
        return;
      }
      context.res = jsonRpcResult(id, { skill: remotionSkill });
      return;
    }

    await next();

    if (method !== "initialize" || !context.res.ok) return;

    const response = context.res;
    const contentType = response.headers.get("content-type") ?? "";
    const responseBody = await response.text();
    let rewrittenBody: string;

    if (contentType.includes("text/event-stream")) {
      rewrittenBody = rewriteServerSentEvents(responseBody);
    } else if (contentType.includes("application/json")) {
      try {
        rewrittenBody = JSON.stringify(addSkillsCapability(JSON.parse(responseBody)));
      } catch {
        return;
      }
    } else {
      return;
    }

    const headers = new Headers(response.headers);
    headers.delete("content-length");
    context.res = new Response(rewrittenBody, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  });
}
