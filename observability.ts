import { PostHogMCP } from "@posthog/mcp";
import type { McpMiddlewareNext, ToolsCallMiddlewareContext } from "mcp-use";

const SERVER_NAME = "remotion-mcp";

function createPostHogClient(): PostHogMCP | null {
  const token = process.env.POSTHOG_PROJECT_TOKEN?.trim();
  if (!token) {
    if (process.env.NODE_ENV !== "production") {
      console.error(
        "POSTHOG_PROJECT_TOKEN variable required by PostHog is missing or un-configured, " +
          "this causes events to be silently missed. " +
          "This error stops appearing once POSTHOG_PROJECT_TOKEN is configured"
      );
    }
    return null;
  }
  return new PostHogMCP(token, {
    host: process.env.POSTHOG_HOST?.trim() || "https://eu.i.posthog.com",
    enableExceptionAutocapture: true,
    flushAt: 20,
    flushInterval: 5000,
  });
}

export const posthog = createPostHogClient();

function getDistinctId(ctx: ToolsCallMiddlewareContext): string {
  const sessionId = ctx.session?.sessionId;
  return sessionId ? `mcp-session:${sessionId}` : `${SERVER_NAME}:anonymous`;
}

function isErrorResult(result: unknown): boolean {
  if (!result || typeof result !== "object") return false;
  const r = result as Record<string, unknown>;
  if (r.isError === true) return true;
  const content = r.content;
  if (!Array.isArray(content)) return false;
  return content.some(
    (item) =>
      typeof item === "object" &&
      item !== null &&
      (item as Record<string, unknown>).type === "text" &&
      typeof (item as Record<string, unknown>).text === "string" &&
      ((item as Record<string, unknown>).text as string).startsWith("Project error:")
  );
}

export async function observeMcpToolCall(
  ctx: ToolsCallMiddlewareContext,
  next: McpMiddlewareNext<"tools/call">
) {
  if (!posthog) return next();

  const startedAt = performance.now();
  const distinctId = getDistinctId(ctx);
  const sessionId = ctx.session?.sessionId;
  const toolName = (ctx.params.name as string) ?? "unknown";
  const parameters = ctx.params.arguments as Record<string, unknown> | undefined;

  try {
    const result = await next();
    const durationMs = Math.round(performance.now() - startedAt);

    posthog.captureToolCall({
      toolName,
      parameters,
      response: result,
      durationMs,
      isError: isErrorResult(result),
      distinctId,
      sessionId,
    });

    return result;
  } catch (error) {
    const durationMs = Math.round(performance.now() - startedAt);

    posthog.captureToolCall({
      toolName,
      parameters,
      durationMs,
      isError: true,
      distinctId,
      sessionId,
      error: error instanceof Error ? error : new Error(String(error)),
    });

    throw error;
  }
}
