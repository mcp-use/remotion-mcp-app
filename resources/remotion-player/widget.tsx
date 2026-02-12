import React, { useMemo, useRef, useState, useEffect, useCallback } from "react";
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

function useStreamingToolInput() {
  const [partialInput, setPartialInput] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    // Strategy 1: Listen for postMessage notifications
    const handler = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== "object") return;

      // Log all messages for debugging (remove in production)
      if (data.jsonrpc || data.type?.startsWith?.("openai")) {
        console.log("[remotion] postMessage:", data.method || data.type);
      }

      // MCP Apps protocol
      if (data.jsonrpc === "2.0") {
        const method = data.method || "";
        if (method.includes("tool-input-partial")) {
          const args = data.params?.arguments ?? data.params ?? {};
          console.log("[remotion] partial input:", Object.keys(args));
          setPartialInput(args);
        }
        if (method.includes("tool-input") && !method.includes("partial")) {
          console.log("[remotion] input complete");
          setPartialInput(null);
        }
      }

      // OpenAI Apps SDK: set_globals carries toolInput progressively
      if (data.type === "openai:set_globals") {
        const toolInput = data.detail?.globals?.toolInput;
        if (toolInput && typeof toolInput === "object") {
          console.log("[remotion] set_globals toolInput:", Object.keys(toolInput));
          setPartialInput(toolInput);
        }
      }
    };
    window.addEventListener("message", handler);

    // Strategy 2: Poll window.openai.toolInput (Apps SDK exposes it directly)
    let pollTimer: ReturnType<typeof setInterval> | undefined;
    const openai = (window as any).openai;
    if (openai) {
      let lastSceneLen = 0;
      pollTimer = setInterval(() => {
        const ti = openai.toolInput;
        if (ti && typeof ti === "object" && ti.scenes) {
          const currentLen = typeof ti.scenes === "string" ? ti.scenes.length : JSON.stringify(ti.scenes).length;
          if (currentLen !== lastSceneLen) {
            lastSceneLen = currentLen;
            setPartialInput({ ...ti });
          }
        }
      }, 300);
    }

    return () => {
      window.removeEventListener("message", handler);
      if (pollTimer) clearInterval(pollTimer);
    };
  }, []);

  return partialInput;
}

// --- localStorage helpers ---
const FS_KEY = "remotion-mcp-fullscreen";
const COMP_KEY = "remotion-mcp-composition";

function persistFullscreen(v: boolean) {
  try { localStorage.setItem(FS_KEY, v ? "1" : "0"); } catch { /* noop */ }
}
function loadFullscreen(): boolean {
  try { return localStorage.getItem(FS_KEY) === "1"; } catch { /* noop */ }
  return false;
}
function persistComp(c: CompositionData) {
  try { localStorage.setItem(COMP_KEY, JSON.stringify(c)); } catch { /* noop */ }
}
function loadComp(): CompositionData | null {
  try { const r = localStorage.getItem(COMP_KEY); if (r) return JSON.parse(r); } catch { /* noop */ }
  return null;
}

// --- Theme detection without useWidget ---
function detectTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ? "dark" : "light";
}

function themeColors(isDark: boolean) {
  return {
    bgPrimary: isDark ? "#141414" : "#ffffff",
    bgSecondary: isDark ? "#1c1c1c" : "#f5f5f5",
    textPrimary: isDark ? "#e0e0e0" : "#1a1a1a",
    textSecondary: isDark ? "#777777" : "#888888",
    borderColor: isDark ? "#2a2a2a" : "#e0e0e0",
  };
}

// ==============================================================
// Fullscreen view: standalone, no mcp-use hooks, reads localStorage
// ==============================================================
const FullscreenPlayer: React.FC = () => {
  const [composition, setComposition] = useState<CompositionData | null>(() => loadComp());
  const playerRef = useRef<PlayerRef>(null);
  const [theme] = useState(detectTheme);
  const c = themeColors(theme === "dark");

  // Listen for composition updates via postMessage (if AI sends new version)
  useEffect(() => {
    const interval = setInterval(() => {
      const fresh = loadComp();
      if (fresh) setComposition(fresh);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const exitFullscreen = useCallback(() => {
    persistFullscreen(false);
    // Try to tell the host to go inline
    try { window.parent?.postMessage({ type: "requestDisplayMode", mode: "inline" }, "*"); } catch { /* noop */ }
    // Fallback: reload to inline
    window.location.reload();
  }, []);

  if (!composition) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "100vh", backgroundColor: "#000", color: c.textSecondary,
        fontFamily: "system-ui, -apple-system, sans-serif", fontSize: 13,
      }}>
        No composition data
      </div>
    );
  }

  const meta = composition.meta;
  const scenes = composition.scenes || [];
  const totalDuration = calculateTotalDuration(scenes);
  const sceneCount = scenes.length;
  const durationSec = (totalDuration / meta.fps).toFixed(1);

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100vh",
      backgroundColor: "#000", fontFamily: "system-ui, -apple-system, sans-serif",
    }}>
      <div style={{
        padding: "8px 14px", display: "flex", alignItems: "center",
        justifyContent: "space-between", backgroundColor: c.bgSecondary,
        borderBottom: `1px solid ${c.borderColor}`, flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: c.textPrimary, fontSize: 13, fontWeight: 500 }}>
          <span>{meta.title || "Untitled"}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11, color: c.textSecondary }}>
          <span>{meta.width}x{meta.height}</span>
          <span>{meta.fps}fps</span>
          <span>{sceneCount} scene{sceneCount !== 1 ? "s" : ""}</span>
          <span>{durationSec}s</span>
          <button onClick={exitFullscreen} style={{
            padding: "3px 10px", fontSize: 11, fontWeight: 500,
            border: `1px solid ${c.borderColor}`, borderRadius: 4,
            cursor: "pointer", backgroundColor: "transparent",
            color: c.textPrimary, fontFamily: "inherit",
          }}>
            Close
          </button>
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Player
          ref={playerRef}
          component={DynamicComposition}
          inputProps={{ scenes }}
          durationInFrames={totalDuration}
          fps={meta.fps}
          compositionWidth={meta.width}
          compositionHeight={meta.height}
          controls
          autoPlay
          loop
          style={{ width: "100%", maxHeight: "100%" }}
        />
      </div>
    </div>
  );
};

// ==============================================================
// Inline view: uses useWidget for props/streaming
// ==============================================================
const InlinePlayer: React.FC = () => {
  const { props, isPending, theme, requestDisplayMode, toolInput } = useWidget();
  const partialInput = useStreamingToolInput();
  const playerRef = useRef<PlayerRef>(null);

  const widgetProps = props as Partial<{ composition: string }>;
  const rawInput = toolInput as Record<string, unknown> | undefined;

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

  // Persist whenever we have a final composition
  useEffect(() => {
    if (finalComposition) persistComp(finalComposition);
  }, [finalComposition]);

  const isStreaming = isPending || !!partialInput;
  const composition = finalComposition || streamingComposition;

  const totalDuration = useMemo(() => {
    if (!composition?.scenes?.length) return 1;
    return calculateTotalDuration(composition.scenes);
  }, [composition?.scenes]);

  const isDark = theme === "dark";
  const c = themeColors(isDark);

  const enterFullscreen = useCallback(async () => {
    if (finalComposition) persistComp(finalComposition);
    persistFullscreen(true);
    try { await requestDisplayMode("fullscreen"); } catch { /* noop */ }
  }, [finalComposition, requestDisplayMode]);

  if (!composition) {
    const title = partialInput?.title || rawInput?.title;
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        minHeight: 240, backgroundColor: c.bgPrimary, borderRadius: 8,
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}>
        <div style={{ textAlign: "center", color: c.textSecondary }}>
          <LoadingDot />
          <div style={{ fontSize: 13, marginTop: 12 }}>
            {title ? `Building "${title}"...` : "Generating..."}
          </div>
        </div>
      </div>
    );
  }

  const meta = composition.meta;
  const sceneCount = composition.scenes?.length || 0;
  const durationSec = (totalDuration / meta.fps).toFixed(1);

  return (
    <div style={{
      borderRadius: 8, overflow: "hidden", backgroundColor: c.bgPrimary,
      fontFamily: "system-ui, -apple-system, sans-serif",
    }}>
      <div style={{
        padding: "8px 14px", display: "flex", alignItems: "center",
        justifyContent: "space-between", backgroundColor: c.bgSecondary,
        borderBottom: `1px solid ${c.borderColor}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: c.textPrimary, fontSize: 13, fontWeight: 500 }}>
          {isStreaming && <LoadingDot />}
          <span>{meta.title || "Untitled"}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11, color: c.textSecondary }}>
          <span>{meta.width}x{meta.height}</span>
          <span>{meta.fps}fps</span>
          <span>{sceneCount} scene{sceneCount !== 1 ? "s" : ""}</span>
          {!isStreaming && <span>{durationSec}s</span>}
          {!isStreaming && (
            <button onClick={enterFullscreen} style={{
              padding: "3px 10px", fontSize: 11, fontWeight: 500,
              border: `1px solid ${c.borderColor}`, borderRadius: 4,
              cursor: "pointer", backgroundColor: "transparent",
              color: c.textPrimary, fontFamily: "inherit",
            }}>
              Edit
            </button>
          )}
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

// ==============================================================
// Root: check localStorage to decide inline vs fullscreen
// ==============================================================
const RemotionPlayerWidget: React.FC = () => {
  const isFs = loadFullscreen();

  if (isFs) {
    return <FullscreenPlayer />;
  }

  return (
    <McpUseProvider autoSize>
      <InlinePlayer />
    </McpUseProvider>
  );
};

export default RemotionPlayerWidget;
