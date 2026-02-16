#!/usr/bin/env node

const defaultEndpoints = [
  process.env.MCP_ENDPOINT,
  "http://localhost:3000/mcp",
  "http://localhost:3001/mcp",
  "http://localhost:3002/mcp",
].filter(Boolean);

const uniqueEndpoints = [...new Set(defaultEndpoints)];

function parseSsePayload(text) {
  return text
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data: "))
    .map((line) => line.slice(6))
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

async function mcpPost(endpoint, body, sessionId) {
  const headers = {
    "content-type": "application/json",
    accept: "application/json, text/event-stream",
  };
  if (sessionId) {
    headers["mcp-session-id"] = sessionId;
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const raw = await response.text();
  const messages = parseSsePayload(raw);
  return {
    status: response.status,
    endpoint,
    sessionId: response.headers.get("mcp-session-id") || sessionId || null,
    messages,
    raw,
  };
}

async function initializeSession(endpoint) {
  const initResponse = await mcpPost(endpoint, {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "smoke-create-video", version: "1.0.0" },
    },
  });

  if (initResponse.status !== 200 || !initResponse.sessionId) {
    throw new Error(`Initialize failed (status ${initResponse.status}).`);
  }

  await mcpPost(
    endpoint,
    { jsonrpc: "2.0", method: "notifications/initialized", params: {} },
    initResponse.sessionId
  );

  const toolsResponse = await mcpPost(
    endpoint,
    {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
      params: {},
    },
    initResponse.sessionId
  );
  const toolsMessage = toolsResponse.messages.find((entry) => entry?.id === 2) ?? toolsResponse.messages[0];
  const tools = toolsMessage?.result?.tools;
  const hasCreateVideo = Array.isArray(tools) && tools.some((tool) => tool?.name === "create_video");
  const hasUpdateVideo = Array.isArray(tools) && tools.some((tool) => tool?.name === "update_video");
  if (!hasCreateVideo || !hasUpdateVideo) {
    throw new Error("Endpoint must expose both create_video and update_video tools.");
  }

  return initResponse.sessionId;
}

async function connect() {
  const errors = [];

  for (const endpoint of uniqueEndpoints) {
    try {
      const sessionId = await initializeSession(endpoint);
      return { endpoint, sessionId };
    } catch (error) {
      errors.push(`${endpoint} -> ${(error).message}`);
    }
  }

  throw new Error(`Could not connect to MCP endpoint.\n${errors.join("\n")}`);
}

function parseToolResult(callResponse) {
  const message = callResponse.messages.find((entry) => entry?.id != null) ?? callResponse.messages[0];
  const result = message?.result;
  if (!result) {
    throw new Error("Missing tool result payload.");
  }

  const text = (result.content || [])
    .filter((content) => content.type === "text")
    .map((content) => content.text)
    .join("\n");

  const rawProject = result.structuredContent?.videoProject;
  if (!rawProject) {
    throw new Error("Missing structuredContent.videoProject.");
  }

  let projectData = null;
  try {
    projectData = JSON.parse(rawProject);
  } catch {
    throw new Error("videoProject is not valid JSON.");
  }

  return { text, projectData };
}

function expect(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function callTool(endpoint, sessionId, name, args, id) {
  const response = await mcpPost(
    endpoint,
    {
      jsonrpc: "2.0",
      id,
      method: "tools/call",
      params: {
        name,
        arguments: args,
      },
    },
    sessionId
  );

  expect(response.status === 200, `${name} returned HTTP ${response.status}`);
  return parseToolResult(response);
}

async function run() {
  const { endpoint, sessionId } = await connect();
  console.log(`Connected to ${endpoint}`);

  const initialProject = await callTool(
    endpoint,
    sessionId,
    "create_video",
    {
      resetProject: true,
      title: "Direct Input Test",
      entryFile: "/src/Video.tsx",
      width: 1280,
      height: 720,
      fps: 30,
      durationInFrames: 120,
      files: {
        "/src/Video.tsx": [
          "import {AbsoluteFill, useCurrentFrame, interpolate} from 'remotion';",
          "export default function Video() {",
          "  const frame = useCurrentFrame();",
          "  const opacity = interpolate(frame, [0, 20], [0, 1], {extrapolateRight: 'clamp'});",
          "  return <AbsoluteFill style={{backgroundColor:'#111', justifyContent:'center', alignItems:'center', color:'white', fontSize:64, opacity}}>Direct OK</AbsoluteFill>;",
          "}",
        ].join("\n"),
      },
    },
    10
  );
  expect(!initialProject.projectData.compileError, "Direct input payload should compile.");
  expect(initialProject.projectData.meta.title === "Direct Input Test", "Direct input title mismatch.");
  expect(initialProject.projectData.meta.durationInFrames === 120, "Direct input duration mismatch.");

  const reusePrevious = await callTool(
    endpoint,
    sessionId,
    "update_video",
    {
      title: "Wrapped Input Updated",
      durationInFrames: 96,
      inputProps: { updated: true },
    },
    11
  );
  expect(!reusePrevious.projectData.compileError, "Previous-project reuse should compile.");
  expect(
    reusePrevious.text.toLowerCase().includes("reused previous session project"),
    "No-files follow-up should reuse previous session state."
  );
  expect(reusePrevious.projectData.meta.durationInFrames === 96, "No-files follow-up duration mismatch.");

  const multiFileBase = await callTool(
    endpoint,
    sessionId,
    "create_video",
    {
      resetProject: true,
      title: "Multi-file Base",
      entryFile: "/src/Video.tsx",
      width: 1280,
      height: 720,
      fps: 30,
      durationInFrames: 120,
      files: {
        "/src/Video.tsx": [
          "import {AbsoluteFill} from 'remotion';",
          "import {Scene} from './Scene';",
          "export default function Video(props) {",
          "  return (",
          "    <AbsoluteFill style={{backgroundColor:'#111', justifyContent:'center', alignItems:'center'}}>",
          "      <Scene label={(props && props.label) || 'Base Label'} />",
          "    </AbsoluteFill>",
          "  );",
          "}",
        ].join("\n"),
        "/src/Scene.tsx": "export const Scene = ({label}) => <div style={{color:'white', fontSize:64}}>{label}</div>;",
      },
      inputProps: { label: "Base Label" },
    },
    12
  );
  expect(!multiFileBase.projectData.compileError, "Multi-file base project should compile.");

  const multiFilePatch = await callTool(
    endpoint,
    sessionId,
    "update_video",
    {
      title: "Multi-file Patched",
      files: {
        "/src/Scene.tsx": "export const Scene = ({label}) => <div style={{color:'#22d3ee', fontSize:64, fontWeight:700}}>{label} v2</div>;",
      },
      inputProps: { label: "Merged Patch" },
    },
    13
  );
  expect(!multiFilePatch.projectData.compileError, "Partial file patch should compile.");
  expect(
    multiFilePatch.text.includes("Entry: /src/Video.tsx (2 files)."),
    "Partial file patch should merge with prior files."
  );
  expect(
    multiFilePatch.text.toLowerCase().includes("reused previous session project"),
    "Partial file patch should report reuse of prior session project."
  );

  const missingFiles = await callTool(
    endpoint,
    sessionId,
    "update_video",
    {
      resetProject: true,
      usePreviousProject: false,
      title: "Missing Files Test",
      width: 1280,
      height: 720,
      fps: 30,
      durationInFrames: 150,
      entryFile: "/src/Video.tsx",
    },
    14
  );
  expect(Boolean(missingFiles.projectData.compileError), "Missing files should return an explicit error.");
  expect(
    missingFiles.text.includes("No project files available."),
    "Missing files should produce a deterministic missing-files error."
  );

  const syntaxError = await callTool(
    endpoint,
    sessionId,
    "create_video",
    {
      resetProject: true,
      title: "Syntax Error Test",
      entryFile: "/src/Video.tsx",
      files: {
        "/src/Video.tsx": [
          "import {AbsoluteFill} from 'remotion';",
          "export default function Video() {",
          "  return <AbsoluteFill style={{backgroundColor:'#000', color:'white'}}>Broken</AbsoluteFill>",
        ].join("\n"),
      },
    },
    15
  );
  expect(Boolean(syntaxError.projectData.compileError), "Syntax error case should return compileError.");
  expect(
    syntaxError.projectData.compileError.toLowerCase().includes("unexpected end of file"),
    "Syntax error should report a useful parser message."
  );

  console.log("Smoke checks passed:");
  console.log("1) Direct create_video payload with files");
  console.log("2) Session reuse when files are omitted");
  console.log("3) Partial file patch merge against prior project");
  console.log("4) Strict missing-files error (no starter fallback)");
  console.log("5) Compile error surfaced in structured project data");
}

run().catch((error) => {
  console.error(`Smoke check failed: ${error.message}`);
  process.exit(1);
});
