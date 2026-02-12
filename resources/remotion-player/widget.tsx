import React, { useMemo, useRef, useState, useEffect } from "react";
import { z } from "zod";
import { McpUseProvider, useWidget, type WidgetMetadata } from "mcp-use/react";
import { Player, type PlayerRef } from "@remotion/player";
import { DynamicComposition } from "./components/DynamicComposition";
import type { CompositionData, SceneData } from "../../types";

const propSchema = z.object({
  composition: z
    .string()
    .describe("JSON string containing the full composition data"),
});

// @ts-expect-error - Zod v4 deep type instantiation with mcp-use WidgetMetadata
export const widgetMetadata: WidgetMetadata = {
  description: "Interactive Remotion video player for previewing compositions",
  props: propSchema,
  exposeAsTool: false,
  metadata: {
    prefersBorder: true,
    autoResize: true,
    widgetDescription:
      "Renders a live Remotion video composition with play/pause/scrub controls",
    csp: {
      resourceDomains: [
        "https://images.unsplash.com",
        "https://picsum.photos",
      ],
    },
  },
};

function calculateTotalDuration(scenes: SceneData[]): number {
  let total = 0;
  for (let i = 0; i < scenes.length; i++) {
    total += scenes[i].durationInFrames;
    if (i < scenes.length - 1 && scenes[i].transition) {
      total -= scenes[i].transition!.durationInFrames;
    }
  }
  return Math.max(total, 1);
}

function tryParseScenes(raw: unknown): SceneData[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.filter(
      (s) => s && typeof s === "object" && s.id && s.durationInFrames && s.background
    );
  }
  if (typeof raw !== "string" || raw.trim().length === 0) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (s: any) => s && typeof s === "object" && s.id && s.durationInFrames && s.background
      );
    }
    return [];
  } catch {
    return extractPartialScenes(raw);
  }
}

function extractPartialScenes(raw: string): SceneData[] {
  const scenes: SceneData[] = [];
  let depth = 0;
  let objectStart = -1;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === "{") {
      if (depth === 0) objectStart = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0 && objectStart >= 0) {
        try {
          const obj = JSON.parse(raw.slice(objectStart, i + 1));
          if (obj.id && obj.durationInFrames && obj.background) scenes.push(obj);
        } catch { /* incomplete */ }
        objectStart = -1;
      }
    }
  }
  return scenes;
}

// Intercept tool-input-partial from postMessage (mcp-use drops these)
function useStreamingToolInput() {
  const [partialInput, setPartialInput] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== "object") return;
      if (data.jsonrpc === "2.0") {
        const method = data.method || "";
        if (
          method === "notifications/tool-input-partial" ||
          method === "ui/notifications/tool-input-partial"
        ) {
          setPartialInput(data.params?.arguments ?? data.params ?? {});
        }
        if (
          method === "notifications/tool-input" ||
          method === "ui/notifications/tool-input"
        ) {
          setPartialInput(null);
        }
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  return partialInput;
}

const RemotionPlayerWidget: React.FC = () => {
  const { props, isPending, theme, toolInput } = useWidget();
  const partialInput = useStreamingToolInput();
  const playerRef = useRef<PlayerRef>(null);

  const widgetProps = props as Partial<{ composition: string }>;
  const rawInput = toolInput as Record<string, unknown> | undefined;

  // Streaming composition from partial input
  const streamingComposition = useMemo<CompositionData | null>(() => {
    const input = partialInput || (isPending ? rawInput : null);
    if (!input) return null;
    const scenes = tryParseScenes(input.scenes);
    if (scenes.length === 0 && !input.title) return null;
    return {
      meta: {
        title: (input.title as string) || "Untitled",
        width: (input.width as number) || 1920,
        height: (input.height as number) || 1080,
        fps: (input.fps as number) || 30,
      },
      scenes,
    };
  }, [partialInput, isPending, rawInput]);

  // Final composition from props or toolInput
  const finalComposition = useMemo<CompositionData | null>(() => {
    if (widgetProps?.composition) {
      try { return JSON.parse(widgetProps.composition); } catch { /* noop */ }
    }
    if (!isPending && rawInput?.scenes) {
      const raw = rawInput.scenes;
      let parsedScenes: SceneData[] = [];
      if (typeof raw === "string") {
        try { parsedScenes = JSON.parse(raw); } catch { /* noop */ }
      } else if (Array.isArray(raw)) {
        parsedScenes = raw;
      }
      if (parsedScenes.length > 0) {
        return {
          meta: {
            title: (rawInput.title as string) || "Untitled",
            width: (rawInput.width as number) || 1920,
            height: (rawInput.height as number) || 1080,
            fps: (rawInput.fps as number) || 30,
          },
          scenes: parsedScenes,
        };
      }
    }
    return null;
  }, [widgetProps?.composition, isPending, rawInput]);

  const isStreaming = isPending || !!partialInput;
  const composition = finalComposition || streamingComposition;

  const totalDuration = useMemo(() => {
    if (!composition?.scenes?.length) return 1;
    return calculateTotalDuration(composition.scenes);
  }, [composition?.scenes]);

  const isDark = theme === "dark";
  const bgPrimary = isDark ? "#141414" : "#ffffff";
  const bgSecondary = isDark ? "#1c1c1c" : "#f5f5f5";
  const textPrimary = isDark ? "#e0e0e0" : "#1a1a1a";
  const textSecondary = isDark ? "#777777" : "#888888";
  const borderColor = isDark ? "#2a2a2a" : "#e0e0e0";

  // Loading
  if (!composition) {
    const title = partialInput?.title || rawInput?.title;
    return (
      <McpUseProvider autoSize>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 240,
            backgroundColor: bgPrimary,
            borderRadius: 8,
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          <div style={{ textAlign: "center", color: textSecondary }}>
            <LoadingDot />
            <div style={{ fontSize: 13, marginTop: 12 }}>
              {title ? `Building "${title}"...` : "Generating..."}
            </div>
          </div>
        </div>
      </McpUseProvider>
    );
  }

  const meta = composition.meta;
  const sceneCount = composition.scenes?.length || 0;
  const durationSec = (totalDuration / meta.fps).toFixed(1);

  return (
    <McpUseProvider autoSize>
      <div
        style={{
          borderRadius: 8,
          overflow: "hidden",
          backgroundColor: bgPrimary,
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div
          style={{
            padding: "8px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: bgSecondary,
            borderBottom: `1px solid ${borderColor}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: textPrimary, fontSize: 13, fontWeight: 500 }}>
            {isStreaming && <LoadingDot />}
            <span>{meta.title || "Untitled"}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11, color: textSecondary }}>
            <span>{meta.width}x{meta.height}</span>
            <span>{meta.fps}fps</span>
            <span>{sceneCount} scene{sceneCount !== 1 ? "s" : ""}</span>
            {!isStreaming && <span>{durationSec}s</span>}
          </div>
        </div>
        <div style={{ backgroundColor: "#000" }}>
          <Player
            key={isStreaming ? `s-${sceneCount}` : "final"}
            ref={playerRef}
            component={DynamicComposition}
            inputProps={{ scenes: composition.scenes }}
            durationInFrames={totalDuration}
            fps={meta.fps}
            compositionWidth={meta.width}
            compositionHeight={meta.height}
            controls={!isStreaming}
            autoPlay
            loop
            style={{ width: "100%" }}
          />
        </div>
      </div>
    </McpUseProvider>
  );
};

const LoadingDot: React.FC = () => {
  const [opacity, setOpacity] = useState(1);
  useEffect(() => {
    let frame: number;
    let start: number;
    const animate = (ts: number) => {
      if (!start) start = ts;
      setOpacity(0.3 + 0.7 * Math.abs(Math.sin(((ts - start) % 1200) / 1200 * Math.PI)));
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", backgroundColor: "currentColor", opacity }} />
  );
};

export default RemotionPlayerWidget;
