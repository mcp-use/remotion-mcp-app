import React, { useMemo, useRef, useState, useEffect, useCallback, Component, type ErrorInfo, type ReactNode } from "react";
import { z } from "zod";
import type { WidgetMetadata } from "mcp-use/react";
import { useApp } from "@modelcontextprotocol/ext-apps/react";
import { Player, type PlayerRef } from "@remotion/player";
import { DynamicComposition } from "./components/DynamicComposition";
import { CodeComposition } from "./components/CodeComposition";
import type { CompositionData, SceneData, VideoCodeData } from "../../types";

class PlayerErrorBoundary extends Component<
  { children: ReactNode; appRef: React.RefObject<any>; dark: boolean },
  { error: string | null }
> {
  state = { error: null as string | null };
  static getDerivedStateFromError(error: Error) { return { error: error.message }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    const isCode = error.message.startsWith("Compilation error:");
    try {
      this.props.appRef.current?.sendFollowUpMessage?.({
        prompt: `The video had a ${isCode ? "compilation" : "runtime"} error:\n\n\`${error.message}\`\n\nPlease fix and call ${isCode ? "create_video" : "the tool"} again.`,
      });
    } catch {}
    console.error("[remotion]", error.message, info.componentStack);
  }
  render() {
    if (this.state.error) {
      const dark = this.props.dark;
      return (
        <div style={{ padding: 16, background: dark ? "#1c1c1c" : "#f5f5f5", borderRadius: 8, fontFamily: "system-ui, sans-serif", color: dark ? "#ff6b6b" : "#dc3545", fontSize: 13 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Error</div>
          <div style={{ opacity: 0.8, fontSize: 12, fontFamily: "monospace", whiteSpace: "pre-wrap" }}>{this.state.error}</div>
        </div>
      );
    }
    return this.props.children;
  }
}

const VERSION = "0.2.1";

const propSchema = z.object({
  composition: z.string().optional().describe("JSON composition (JSON mode)"),
  videoCode: z.string().optional().describe("JSON with meta + code (code mode)"),
});

// @ts-expect-error - Zod v4 deep type instantiation
export const widgetMetadata: WidgetMetadata = {
  description: "Remotion video player",
  props: propSchema,
  exposeAsTool: false,
  metadata: {
    prefersBorder: true,
    autoResize: true,
    widgetDescription: "Renders a Remotion video composition",
    csp: {
      resourceDomains: ["https://images.unsplash.com", "https://picsum.photos"],
      scriptDirectives: ["'unsafe-eval'"],
    },
  },
};

// --- JSON mode helpers ---

function calcDuration(scenes: SceneData[]): number {
  let t = 0;
  for (let i = 0; i < scenes.length; i++) {
    t += scenes[i].durationInFrames;
    if (i < scenes.length - 1 && scenes[i].transition) t -= scenes[i].transition!.durationInFrames;
  }
  return Math.max(t, 1);
}

function tryParseScenes(raw: unknown): SceneData[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter((s) => s?.id && s?.durationInFrames && s?.background);
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((s: any) => s?.id && s?.durationInFrames && s?.background);
  } catch {
    const scenes: SceneData[] = [];
    let depth = 0, start = -1;
    for (let i = 0; i < raw.length; i++) {
      if (raw[i] === "{") { if (depth === 0) start = i; depth++; }
      else if (raw[i] === "}") { depth--; if (depth === 0 && start >= 0) { try { const o = JSON.parse(raw.slice(start, i + 1)); if (o.id && o.durationInFrames && o.background) scenes.push(o); } catch {} start = -1; } }
    }
    return scenes;
  }
  return [];
}

function buildComposition(input: Record<string, unknown> | null): CompositionData | null {
  if (!input) return null;
  const scenes = tryParseScenes(input.scenes);
  if (!scenes.length) return null;
  return { meta: { title: (input.title as string) || "Untitled", width: (input.width as number) || 1920, height: (input.height as number) || 1080, fps: (input.fps as number) || 30 }, scenes };
}

// --- Persist last video across widget instances ---
const PREV_KEY = "remotion-mcp-prev";
function savePrev(data: CompositionData | VideoCodeData) {
  try { localStorage.setItem(PREV_KEY, JSON.stringify(data)); } catch {}
}
function loadPrev(): { comp?: CompositionData; code?: VideoCodeData } | null {
  try {
    const raw = localStorage.getItem(PREV_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.code && parsed.meta?.durationInFrames) return { code: parsed };
    if (parsed.scenes) return { comp: parsed };
  } catch {}
  return null;
}

// --- Code mode helpers ---

function buildVideoCode(input: Record<string, unknown> | null): VideoCodeData | null {
  if (!input) return null;
  // From videoCode prop (server sends JSON string)
  const raw = input.videoCode;
  if (raw && typeof raw === "string") {
    try { const p = JSON.parse(raw); if (p.meta && p.code) return p; } catch {}
  }
  // From direct tool input (code field)
  if (input.code && typeof input.code === "string" && input.durationInFrames) {
    return {
      meta: { title: (input.title as string) || "Untitled", width: (input.width as number) || 1920, height: (input.height as number) || 1080, fps: (input.fps as number) || 30, durationInFrames: input.durationInFrames as number },
      code: input.code as string,
    };
  }
  return null;
}

// --- Widget ---

export default function RemotionPlayerWidget() {
  const [toolInput, setToolInput] = useState<Record<string, unknown> | null>(null);
  const [isFinal, setIsFinal] = useState(false);
  const [resultComp, setResultComp] = useState<CompositionData | null>(null);
  const [resultCode, setResultCode] = useState<VideoCodeData | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(
    typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ? "dark" : "light"
  );
  const ref = useRef<PlayerRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<any>(null);

  useApp({
    appInfo: { name: "Remotion", version: "1.0.0" },
    capabilities: {},
    onAppCreated: (app) => {
      appRef.current = app;
      app.ontoolinputpartial = (params: any) => { setIsFinal(false); setToolInput(params?.arguments ?? params ?? {}); };
      app.ontoolinput = (params: any) => { setIsFinal(true); setToolInput(params?.arguments ?? params ?? {}); };
      app.ontoolresult = (result: any) => {
        const props = result?.structuredContent?.["mcp-use/props"] ?? result?.content?.[0]?.["mcp-use/props"] ?? {};
        // JSON mode
        if (props.composition && typeof props.composition === "string") {
          try { setResultComp(JSON.parse(props.composition)); } catch {}
        }
        // Code mode
        if (props.videoCode && typeof props.videoCode === "string") {
          try { const p = JSON.parse(props.videoCode); if (p.meta && p.code) setResultCode(p); } catch {}
        }
      };
      app.onhostcontextchanged = (params: any) => { if (params?.theme) setTheme(params.theme); };
    },
  });

  // Load previous video from localStorage (survives across widget instances)
  const [prev] = useState(() => loadPrev());

  // JSON mode state
  const streamingComp = useMemo(() => (!isFinal ? buildComposition(toolInput) : null), [isFinal, toolInput]);
  const finalComp = useMemo(() => resultComp || (isFinal ? buildComposition(toolInput) : null), [resultComp, isFinal, toolInput]);
  const prevCompRef = useRef<CompositionData | null>(prev?.comp || null);
  useEffect(() => { if (finalComp) { prevCompRef.current = finalComp; savePrev(finalComp); } }, [finalComp]);

  // Code mode state
  const finalCode = useMemo(() => resultCode || (isFinal ? buildVideoCode(toolInput) : null), [resultCode, isFinal, toolInput]);
  const prevCodeRef = useRef<VideoCodeData | null>(prev?.code || null);
  useEffect(() => { if (finalCode) { prevCodeRef.current = finalCode; savePrev(finalCode); } }, [finalCode]);

  // Determine active mode and data
  const isCodeMode = !!(finalCode || prevCodeRef.current || buildVideoCode(toolInput));
  const comp = finalComp || streamingComp || prevCompRef.current;
  const codeData = finalCode || prevCodeRef.current;
  const isStreaming = !isFinal && !finalComp && !finalCode;

  // Active rendering data
  const activeMeta = isCodeMode ? codeData?.meta : comp?.meta;
  const activeDur = isCodeMode
    ? (codeData?.meta.durationInFrames || 1)
    : (comp?.scenes ? calcDuration(comp.scenes) : 1);
  const hasData = isCodeMode ? !!codeData : !!comp;

  const download = useCallback(() => {
    const data = isCodeMode ? codeData : comp;
    if (!data) return;
    const json = JSON.stringify(data, null, 2);
    const a = document.createElement("a");
    a.href = "data:application/json;charset=utf-8," + encodeURIComponent(json);
    a.download = `${(data as any).meta?.title || "video"}.json`;
    a.click();
  }, [isCodeMode, codeData, comp]);

  useEffect(() => {
    if (!activeMeta || isFullscreen) return;
    const aspect = activeMeta.height / activeMeta.width;
    const w = containerRef.current?.offsetWidth || 600;
    try { appRef.current?.notifyIntrinsicHeight?.(Math.round(w * aspect) + 37); } catch {}
  }, [activeMeta, isFullscreen]);

  const dark = theme === "dark";
  const bg = dark ? "#141414" : "#fff";
  const bg2 = dark ? "#1c1c1c" : "#f5f5f5";
  const fg = dark ? "#e0e0e0" : "#1a1a1a";
  const fg2 = dark ? "#777" : "#888";
  const bd = dark ? "#2a2a2a" : "#e0e0e0";

  if (!hasData) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200, background: bg, borderRadius: 8, fontFamily: "system-ui, sans-serif", color: fg2, fontSize: 13 }}>
        {toolInput?.title ? `Creating "${toolInput.title}"...` : "Creating..."}
      </div>
    );
  }

  const title = activeMeta?.title || "Untitled";
  const info = activeMeta
    ? `${activeMeta.width}x${activeMeta.height} · ${activeMeta.fps}fps · ${(activeDur / activeMeta.fps).toFixed(1)}s`
    : "";

  // Build the Player element (reused in both inline and fullscreen)
  const playerEl = (
    <PlayerErrorBoundary appRef={appRef} dark={dark}>
      <Player
        key={isStreaming ? `s-${comp?.scenes?.length || 0}` : "final"}
        ref={ref}
        component={isCodeMode ? CodeComposition as any : DynamicComposition}
        inputProps={isCodeMode ? { code: codeData!.code } as any : { scenes: comp!.scenes }}
        durationInFrames={activeDur}
        fps={activeMeta!.fps}
        compositionWidth={activeMeta!.width}
        compositionHeight={activeMeta!.height}
        controls={!isStreaming}
        autoPlay
        loop
        style={{ width: "100%", maxHeight: isFullscreen ? "100%" : undefined }}
      />
    </PlayerErrorBoundary>
  );

  if (isFullscreen) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#000", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ padding: "8px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", background: bg2, borderBottom: `1px solid ${bd}`, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: fg, fontSize: 13, fontWeight: 500 }}>{title}</span>
            <span style={{ color: fg2, fontSize: 9, opacity: 0.5 }}>v{VERSION}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11, color: fg2 }}>
            <span>{info}</span>
            <button onClick={download} style={{ padding: "3px 10px", fontSize: 11, fontWeight: 500, border: `1px solid ${bd}`, borderRadius: 4, cursor: "pointer", background: "transparent", color: fg, fontFamily: "inherit" }}>Download</button>
            <button onClick={() => { setIsFullscreen(false); try { appRef.current?.requestDisplayMode?.({ mode: "inline" }); } catch {} }} style={{ padding: "3px 10px", fontSize: 11, fontWeight: 500, border: `1px solid ${bd}`, borderRadius: 4, cursor: "pointer", background: "transparent", color: fg, fontFamily: "inherit" }}>Close</button>
          </div>
        </div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>{playerEl}</div>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ borderRadius: 8, overflow: "hidden", background: bg, fontFamily: "system-ui, sans-serif" }}>
      <div style={{ padding: "8px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", background: bg2, borderBottom: `1px solid ${bd}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: fg, fontSize: 13, fontWeight: 500 }}>{title}</span>
          <span style={{ color: fg2, fontSize: 9, opacity: 0.5 }}>v{VERSION}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11, color: fg2 }}>
          {!isStreaming && <span>{info}</span>}
          {!isStreaming && <button onClick={download} style={{ padding: "3px 10px", fontSize: 11, fontWeight: 500, border: `1px solid ${bd}`, borderRadius: 4, cursor: "pointer", background: "transparent", color: fg, fontFamily: "inherit" }}>Download</button>}
          {!isStreaming && <button onClick={() => { setIsFullscreen(true); try { appRef.current?.requestDisplayMode?.({ mode: "fullscreen" }); } catch {} }} style={{ padding: "3px 10px", fontSize: 11, fontWeight: 500, border: `1px solid ${bd}`, borderRadius: 4, cursor: "pointer", background: "transparent", color: fg, fontFamily: "inherit" }}>Edit</button>}
        </div>
      </div>
      {playerEl}
    </div>
  );
}
