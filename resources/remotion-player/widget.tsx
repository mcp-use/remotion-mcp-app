import React, { useMemo, useRef, useState, useEffect, useCallback, Component, type ErrorInfo, type ReactNode } from "react";
import { z } from "zod";
import type { WidgetMetadata } from "mcp-use/react";
import { McpUseProvider } from "mcp-use/react";
import { useApp } from "@modelcontextprotocol/ext-apps/react";
import { Player, type PlayerRef } from "@remotion/player";
import { CodeComposition } from "./components/CodeComposition";
import type { VideoCodeData } from "../../types";

class PlayerErrorBoundary extends Component<
  { children: ReactNode; appRef: React.RefObject<any>; dark: boolean },
  { error: string | null }
> {
  state = { error: null as string | null };
  static getDerivedStateFromError(error: Error) { return { error: error.message }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    try {
      this.props.appRef.current?.sendFollowUpMessage?.({
        prompt: `The video had an error:\n\n\`${error.message}\`\n\nPlease fix the code and call create_video again.`,
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

const VERSION = "0.3.0";

const propSchema = z.object({
  videoCode: z.string().optional().describe("JSON with meta + code"),
});

// @ts-expect-error - Zod v4 deep type instantiation
export const widgetMetadata: WidgetMetadata = {
  description: "Remotion video player",
  props: propSchema,
  exposeAsTool: false,
  metadata: {
    prefersBorder: true,
    autoResize: true,
    widgetDescription: "Renders a Remotion video",
    csp: {
      resourceDomains: ["https://images.unsplash.com", "https://picsum.photos"],
      scriptDirectives: ["'unsafe-eval'"],
    },
  },
};

// --- Persist last video across widget instances ---
const PREV_KEY = "remotion-mcp-prev";
function savePrev(data: VideoCodeData) {
  try { localStorage.setItem(PREV_KEY, JSON.stringify(data)); } catch {}
}
function loadPrev(): VideoCodeData | null {
  try {
    const raw = localStorage.getItem(PREV_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.code && parsed.meta?.durationInFrames) return parsed;
  } catch {}
  return null;
}

function parseVideoCode(input: Record<string, unknown> | null): VideoCodeData | null {
  if (!input) return null;
  const raw = input.videoCode;
  if (raw && typeof raw === "string") {
    try {
      const p = JSON.parse(raw);
      if (p.meta && p.code && p.code.trim() && p.meta.durationInFrames > 0) return p;
    } catch {}
  }
  const code = input.code;
  const dur = input.durationInFrames;
  if (code && typeof code === "string" && code.trim() && dur && (dur as number) > 0) {
    return {
      meta: { title: (input.title as string) || "Untitled", width: (input.width as number) || 1920, height: (input.height as number) || 1080, fps: (input.fps as number) || 30, durationInFrames: dur as number },
      code: code as string,
    };
  }
  return null;
}

export default function RemotionPlayerWidgetWrapper() {
  return (
    <McpUseProvider autoSize>
      <RemotionPlayerWidget />
    </McpUseProvider>
  );
}

function RemotionPlayerWidget() {
  const [toolInput, setToolInput] = useState<Record<string, unknown> | null>(null);
  const [isFinal, setIsFinal] = useState(false);
  const [result, setResult] = useState<VideoCodeData | null>(null);
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
      app.ontoolresult = (r: any) => {
        const props = r?.structuredContent?.["mcp-use/props"] ?? r?.content?.[0]?.["mcp-use/props"] ?? {};
        if (props.videoCode && typeof props.videoCode === "string") {
          try { const p = JSON.parse(props.videoCode); if (p.meta && p.code) setResult(p); } catch {}
        }
      };
      app.onhostcontextchanged = (params: any) => { if (params?.theme) setTheme(params.theme); };
    },
  });

  const [prev] = useState(() => loadPrev());
  const finalData = useMemo(() => result || (isFinal ? parseVideoCode(toolInput) : null), [result, isFinal, toolInput]);
  const prevRef = useRef<VideoCodeData | null>(prev);
  useEffect(() => { if (finalData) { prevRef.current = finalData; savePrev(finalData); } }, [finalData]);

  const data = finalData || prevRef.current;
  const hasData = !!data;

  const toggleFullscreen = useCallback(() => {
    const next = !isFullscreen;
    setIsFullscreen(next);
    try { appRef.current?.requestDisplayMode?.({ mode: next ? "fullscreen" : "inline" }); } catch {}
  }, [isFullscreen]);

  // Height auto-sizing is handled by McpUseProvider's autoSize prop
  // which uses ResizeObserver + bridge.sendSizeChanged().

  const dark = theme === "dark";
  const bg = dark ? "#141414" : "#fff";
  const fg = dark ? "#e0e0e0" : "#1a1a1a";
  const fg2 = dark ? "#777" : "#888";
  const bg2 = dark ? "#1c1c1c" : "#f5f5f5";
  const bd = dark ? "#2a2a2a" : "#e0e0e0";

  if (!hasData) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200, background: bg, borderRadius: 8, fontFamily: "system-ui, sans-serif", color: fg2, fontSize: 13 }}>
        {toolInput?.title ? `Creating "${toolInput.title}"...` : "Creating..."}
      </div>
    );
  }

  const { meta, code } = data!;

  const fsIcon = isFullscreen
    ? <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 2 6 6 2 6"/><polyline points="10 14 10 10 14 10"/><line x1="2" y1="2" x2="6" y2="6"/><line x1="14" y1="14" x2="10" y2="10"/></svg>
    : <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="10 2 14 2 14 6"/><polyline points="6 14 2 14 2 10"/><line x1="14" y1="2" x2="10" y2="6"/><line x1="2" y1="14" x2="6" y2="10"/></svg>;

  const header = (
    <div style={{ padding: "6px 10px 6px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
      <span style={{ color: fg, fontSize: 13, fontWeight: 500 }}>{meta.title}</span>
      <button onClick={toggleFullscreen} title={isFullscreen ? "Exit fullscreen" : "Fullscreen"} style={{ background: "none", border: "none", cursor: "pointer", padding: 6, display: "flex", alignItems: "center", justifyContent: "center", color: fg2, borderRadius: 4, opacity: 0.7 }}>
        {fsIcon}
      </button>
    </div>
  );

  const playerEl = (
    <PlayerErrorBoundary appRef={appRef} dark={dark}>
      <Player
        ref={ref}
        component={CodeComposition as any}
        inputProps={{ code }}
        durationInFrames={meta.durationInFrames}
        fps={meta.fps}
        compositionWidth={meta.width}
        compositionHeight={meta.height}
        controls
        autoPlay
        loop
        style={{ width: "100%", maxHeight: isFullscreen ? "100%" : undefined }}
      />
    </PlayerErrorBoundary>
  );

  if (isFullscreen) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#000", fontFamily: "system-ui, sans-serif" }}>
        {header}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>{playerEl}</div>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ borderRadius: 8, overflow: "hidden", background: bg, fontFamily: "system-ui, sans-serif" }}>
      {header}
      {playerEl}
    </div>
  );
}
