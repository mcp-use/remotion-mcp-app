# PostHog MCP Analytics Setup Report

## What was done

Instrumented the Remotion MCP server with PostHog MCP analytics using the `@posthog/mcp` SDK (v0.10.3). Every tool call the server handles is now captured as a `$mcp_tool_call` event in PostHog.

**Instrumentation path**: Path C — custom dispatcher via `mcp-use` v2 middleware. The `@posthog/mcp` package's `instrument()` function requires direct access to an SDK server object, so `PostHogMCP` (the custom-dispatcher client) is wired through `mcp-use`'s `server.use("mcp:tools/call", ...)` middleware.

## Files modified or created

| File | Change |
|------|--------|
| `observability.ts` | **Created** — Initializes a `PostHogMCP` client from env vars, exports `observeMcpToolCall` middleware that captures `$mcp_tool_call` events (with duration, error state, session ID, and tool arguments) |
| `index.ts` | **Modified** — Imports `observeMcpToolCall` and `posthog` from `observability.ts`, registers the middleware with `server.use("mcp:tools/call", ...)`, and adds a `SIGTERM` handler to flush events on shutdown |
| `.env` | **Created** — Contains `POSTHOG_PROJECT_TOKEN` and `POSTHOG_HOST` |
| `package.json` / `package-lock.json` | **Modified** — `@posthog/mcp@0.10.3` added as a dependency |

## What events are captured

Once the server handles its next request, you will see `$mcp_tool_call` events in PostHog for every tool invocation. Each event includes:

- `$mcp_tool_name` — which tool was called
- `$mcp_parameters` — the call arguments (sanitized)
- `$mcp_response` — the tool result (sanitized)
- `$mcp_duration_ms` — wall-clock duration
- `$mcp_is_error` — whether the call failed
- `$session_id` — derived from the MCP session (when available)
- A `$exception` sibling event is automatically emitted on errors

## Manual steps to take next

1. **Rebuild the project** before deploying so the new `observability.ts` is included:
   ```bash
   npm run build
   ```

2. **Verify the `.env` is loaded** by your deployment environment. The server reads `POSTHOG_PROJECT_TOKEN` and `POSTHOG_HOST` at startup. If these are unset, observability is silently disabled (a warning is printed in non-production environments).

3. **View your analytics** at [PostHog MCP Analytics](https://posthog.com/docs/mcp-analytics) — the dashboard and event reference describe what you can explore with `$mcp_tool_call` events.

> **Note**: `@posthog/mcp` is pre-1.0 (beta). The API may change in minor `0.x` releases. Pin to the installed version (`0.10.3`) until v1 is released.
