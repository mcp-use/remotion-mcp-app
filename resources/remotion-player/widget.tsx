import React, { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { z } from "zod";
import type { WidgetMetadata } from "mcp-use/react";
import { useApp } from "@modelcontextprotocol/ext-apps/react";
import { Player, type PlayerRef } from "@remotion/player";
import { DynamicComposition } from "./components/DynamicComposition";
import type { CompositionData, SceneData } from "../../types";

const VERSION = "0.1.4";

const propSchema = z.object({
  composition: z.string().describe("JSON string of the composition"),
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
    },
  },
};

function totalDuration(scenes: SceneData[]): number {
  let t = 0;
  for (let i = 0; i < scenes.length; i++) {
    t += scenes[i].durationInFrames;
    if (i < scenes.length - 1 && scenes[i].transition)
      t -= scenes[i].transition!.durationInFrames;
  }
  return Math.max(t, 1);
}

function tryParseScenes(raw: unknown): SceneData[] {
  if (!raw) return [];
  if (Array.isArray(raw))
    return raw.filter((s) => s?.id && s?.durationInFrames && s?.background);
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed))
      return parsed.filter((s: any) => s?.id && s?.durationInFrames && s?.background);
  } catch {
    // Partial JSON — extract complete scene objects by brace matching
    const scenes: SceneData[] = [];
    let depth = 0, start = -1;
    for (let i = 0; i < raw.length; i++) {
      if (raw[i] === "{") { if (depth === 0) start = i; depth++; }
      else if (raw[i] === "}") {
        depth--;
        if (depth === 0 && start >= 0) {
          try {
            const obj = JSON.parse(raw.slice(start, i + 1));
            if (obj.id && obj.durationInFrames && obj.background) scenes.push(obj);
          } catch {}
          start = -1;
        }
      }
    }
    return scenes;
  }
  return [];
}

function buildComposition(input: Record<string, unknown> | null): CompositionData | null {
  if (!input) return null;
  const scenes = tryParseScenes(input.scenes);
  if (!scenes.length) return null;
  return {
    meta: {
      title: (input.title as string) || "Untitled",
      width: (input.width as number) || 1920,
      height: (input.height as number) || 1080,
      fps: (input.fps as number) || 30,
    },
    scenes,
  };
}

export default function RemotionPlayerWidget() {
  const [toolInput, setToolInput] = useState<Record<string, unknown> | null>(null);
  const [isFinal, setIsFinal] = useState(false);
  const [resultComp, setResultComp] = useState<CompositionData | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(
    typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)")?.matches
      ? "dark" : "light"
  );
  const ref = useRef<PlayerRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<any>(null);

  useApp({
    appInfo: { name: "Remotion", version: "1.0.0" },
    capabilities: {},
    onAppCreated: (app) => {
      appRef.current = app;
      app.ontoolinputpartial = (params: any) => {
        setIsFinal(false);
        setToolInput(params?.arguments ?? params ?? {});
      };
      app.ontoolinput = (params: any) => {
        setIsFinal(true);
        setToolInput(params?.arguments ?? params ?? {});
      };
      app.ontoolresult = (result: any) => {
        const compStr =
          result?.structuredContent?.["mcp-use/props"]?.composition
          ?? result?.content?.[0]?.["mcp-use/props"]?.composition;
        if (compStr && typeof compStr === "string") {
          try { setResultComp(JSON.parse(compStr)); } catch {}
        }
      };
      app.onhostcontextchanged = (params: any) => {
        if (params?.theme) setTheme(params.theme);
      };
    },
  });

  const streamingComp = useMemo(() => (!isFinal ? buildComposition(toolInput) : null), [isFinal, toolInput]);
  const finalComp = useMemo(() => resultComp || (isFinal ? buildComposition(toolInput) : null), [resultComp, isFinal, toolInput]);
  const comp = finalComp || streamingComp;
  const isStreaming = !isFinal && !!streamingComp;
  const dur = useMemo(() => comp?.scenes ? totalDuration(comp.scenes) : 1, [comp?.scenes]);

  const download = useCallback(() => {
    if (!comp) return;
    const json = JSON.stringify(comp, null, 2);
    const name = `${comp.meta.title || "composition"}.json`;
    // Try data URL download (works in some sandboxed iframes)
    const a = document.createElement("a");
    a.href = "data:application/json;charset=utf-8," + encodeURIComponent(json);
    a.download = name;
    a.click();
    // Also try openExternal as fallback (opens in new tab)
    try { appRef.current?.openExternal?.({ href: "data:application/json;charset=utf-8," + encodeURIComponent(json) }); } catch {}
  }, [comp]);

  // Tell the host how tall we want to be
  useEffect(() => {
    if (!comp || isFullscreen) return;
    const HEADER = 37;
    const aspect = comp.meta.height / comp.meta.width;
    const width = containerRef.current?.offsetWidth || 600;
    const height = Math.round(width * aspect) + HEADER;
    try { appRef.current?.notifyIntrinsicHeight?.(height); } catch {}
  }, [comp, isFullscreen]);

  const dark = theme === "dark";
  const bg = dark ? "#141414" : "#fff";
  const bg2 = dark ? "#1c1c1c" : "#f5f5f5";
  const fg = dark ? "#e0e0e0" : "#1a1a1a";
  const fg2 = dark ? "#777" : "#888";
  const bd = dark ? "#2a2a2a" : "#e0e0e0";

  if (!comp) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200, background: bg, borderRadius: 8, fontFamily: "system-ui, sans-serif", color: fg2, fontSize: 13 }}>
        {toolInput?.title ? `Creating "${toolInput.title}"...` : "Creating..."}
      </div>
    );
  }

  const { meta, scenes } = comp;
  const sceneCount = scenes.length;

  if (isFullscreen) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#000", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ padding: "8px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", background: bg2, borderBottom: `1px solid ${bd}`, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: fg, fontSize: 13, fontWeight: 500 }}>{meta.title}</span>
            <span style={{ color: fg2, fontSize: 9, opacity: 0.5 }}>v{VERSION}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11, color: fg2 }}>
            <span>{meta.width}x{meta.height} · {meta.fps}fps · {sceneCount} scene{sceneCount !== 1 ? "s" : ""} · {(dur / meta.fps).toFixed(1)}s</span>
            <button onClick={download} style={{ padding: "3px 10px", fontSize: 11, fontWeight: 500, border: `1px solid ${bd}`, borderRadius: 4, cursor: "pointer", background: "transparent", color: fg, fontFamily: "inherit" }}>
              Download
            </button>
            <button onClick={() => { setIsFullscreen(false); try { appRef.current?.requestDisplayMode?.({ mode: "inline" }); } catch {} }} style={{ padding: "3px 10px", fontSize: 11, fontWeight: 500, border: `1px solid ${bd}`, borderRadius: 4, cursor: "pointer", background: "transparent", color: fg, fontFamily: "inherit" }}>
              Close
            </button>
          </div>
        </div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Player
            ref={ref}
            component={DynamicComposition}
            inputProps={{ scenes }}
            durationInFrames={dur}
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
  }

  return (
    <div ref={containerRef} style={{ borderRadius: 8, overflow: "hidden", background: bg, fontFamily: "system-ui, sans-serif" }}>
      <div style={{ padding: "8px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", background: bg2, borderBottom: `1px solid ${bd}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: fg, fontSize: 13, fontWeight: 500 }}>
            {meta.title}{isStreaming ? ` (${sceneCount} scene${sceneCount !== 1 ? "s" : ""}...)` : ""}
          </span>
          <span style={{ color: fg2, fontSize: 9, opacity: 0.5 }}>v{VERSION}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11, color: fg2 }}>
          {!isStreaming && (
            <span>{meta.width}x{meta.height} · {meta.fps}fps · {sceneCount} scene{sceneCount !== 1 ? "s" : ""} · {(dur / meta.fps).toFixed(1)}s</span>
          )}
          {!isStreaming && (
            <button onClick={download} style={{ padding: "3px 10px", fontSize: 11, fontWeight: 500, border: `1px solid ${bd}`, borderRadius: 4, cursor: "pointer", background: "transparent", color: fg, fontFamily: "inherit" }}>
              Download
            </button>
          )}
          {!isStreaming && (
            <button onClick={() => { setIsFullscreen(true); try { appRef.current?.requestDisplayMode?.({ mode: "fullscreen" }); } catch {} }} style={{ padding: "3px 10px", fontSize: 11, fontWeight: 500, border: `1px solid ${bd}`, borderRadius: 4, cursor: "pointer", background: "transparent", color: fg, fontFamily: "inherit" }}>
              Edit
            </button>
          )}
        </div>
      </div>
      <Player
        key={isStreaming ? `s-${sceneCount}` : "final"}
        ref={ref}
        component={DynamicComposition}
        inputProps={{ scenes }}
        durationInFrames={dur}
        fps={meta.fps}
        compositionWidth={meta.width}
        compositionHeight={meta.height}
        controls={!isStreaming}
        autoPlay
        loop
        style={{ width: "100%" }}
      />
    </div>
  );
}
