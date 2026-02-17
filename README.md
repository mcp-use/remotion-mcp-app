<p align="center">
  <img src="assets/header.svg" alt="Remotion MCP" width="100%"/>
</p>

# Remotion MCP Server

An MCP server that lets AI models create and edit [Remotion](https://remotion.dev) videos through conversation. The model writes React code, the server compiles it instantly, and a live player renders the result inline.

## Try it now

Connect any MCP client to the hosted server:

```
https://still-feather-l5mwy.run.mcp-use.com/mcp
```

Works with ChatGPT, Claude, or any MCP-compatible client.

## Demos

### ChatGPT + Remotion MCP

<video src="https://github.com/mcp-use/remotion-mcp-app/releases/download/v1.0.0/openairemotion.mp4" controls width="100%"></video>

### Claude + Remotion MCP

<video src="https://github.com/mcp-use/remotion-mcp-app/releases/download/v1.0.0/ClaudeRemotionDemo.mp4" controls width="100%"></video>

## How it works

1. The model calls `create_video` with React/Remotion source files
2. The server compiles the project with esbuild (sub-second)
3. A Remotion Player widget renders the video inline in the chat
4. For edits, the model calls `create_video` again with only changed files -- previous files are preserved automatically

The server exposes **rule tools** that teach the model Remotion patterns on demand (animations, timing, transitions, sequencing). The model calls these before writing code to learn the API.

## Architecture

```
Model                    MCP Server                  Widget
  |                          |                          |
  |-- create_video({files}) ->|                          |
  |                          |-- esbuild compile ------->|
  |                          |<- bundle + meta ----------|
  |<- structuredContent -----|                          |
  |                          |          Remotion Player ->| (renders inline)
  |                          |                          |
  |-- create_video({edits}) ->|                          |
  |                          |-- merge + recompile ----->|
  |                          |          Player updates -->| (in-place)
```

### Single tool design

There is one tool: `create_video`. It handles both creation and editing. The `files` parameter is always required -- for edits, only send changed files. The server merges them with the previous session state.

### Rule tools

The server includes teaching tools that the model can call to learn Remotion patterns:

| Tool | Topic |
|------|-------|
| `rule_react_code` | Project structure, imports, entry file contract |
| `rule_remotion_animations` | `useCurrentFrame`, frame-driven animation |
| `rule_remotion_timing` | `interpolate`, `spring`, `Easing` configs |
| `rule_remotion_sequencing` | `Sequence`, scene management, duration |
| `rule_remotion_transitions` | `TransitionSeries`, fade, slide, wipe |
| `rule_remotion_text_animations` | Typewriter effect, word highlighting |
| `rule_remotion_trimming` | Trimming with negative `Sequence` from |

### Widget

The Remotion Player widget runs inside the chat interface. It features:

- Live video playback with controls
- Animated loading state with shader gradient while the model writes code
- Editing overlay (blur + gradient) when updating an existing video
- Fullscreen mode
- Error display with compilation error details

## Local development

### Prerequisites

- Node.js 18+
- npm or pnpm

### Setup

```bash
git clone https://github.com/mcp-use/remotion-mcp-app.git
cd remotion-mcp-app
npm install
npm run dev
```

The server starts at `http://localhost:3000/mcp`.

### Connect a client

Point any MCP client at `http://localhost:3000/mcp`. For example with [mcp-use](https://mcp-use.com):

```json
{
  "mcpServers": {
    "remotion": {
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

### Build and deploy

```bash
npm run build
npm run deploy
```

## Project structure

```
index.ts                     -- MCP server, tool definitions, handler
utils.ts                     -- esbuild compilation, session state, response helpers
types.ts                     -- Shared types (VideoProjectData, VideoMeta)
rules/                       -- Remotion teaching content served by rule tools
resources/remotion-player/   -- Widget source (React + Remotion Player)
  widget.tsx                 -- Main widget component
  components/
    CodeComposition.tsx      -- Bundle compiler (eval + runtime shim)
```

## Tool schema

```typescript
create_video({
  files: string,            // REQUIRED -- JSON string of {path: code}
  entryFile?: string,       // Default: "/src/Video.tsx"
  title?: string,
  durationInFrames?: number, // Default: 150
  fps?: number,             // Default: 30
  width?: number,           // Default: 1920
  height?: number,          // Default: 1080
})
```

The `files` parameter is a JSON string mapping virtual file paths to source code:

```json
{
  "/src/Video.tsx": "import {AbsoluteFill} from \"remotion\";\nexport default function Video() { return <AbsoluteFill />; }"
}
```

## Session behavior

- Each MCP session maintains its own project state
- Calling `create_video` merges new files with the previous project
- Metadata (title, fps, dimensions) carries forward unless overridden
- Sessions are capped at 250 concurrent projects with LRU eviction

## License

MIT -- see [LICENSE](LICENSE) for details.

Note: [Remotion](https://remotion.dev) is a dependency with its own license. Free for individuals and companies with up to 3 employees. Larger organizations need a [company license](https://www.remotion.pro/license).

---

Built with [mcp-use](https://mcp-use.com) and [Remotion](https://remotion.dev).
