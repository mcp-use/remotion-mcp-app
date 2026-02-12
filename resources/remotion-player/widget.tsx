import React, { useMemo, useRef, useState, useEffect } from "react";
import { z } from "zod";
import type { WidgetMetadata } from "mcp-use/react";
import { useApp } from "@modelcontextprotocol/ext-apps/react";
import { Player, type PlayerRef } from "@remotion/player";
import { DynamicComposition } from "./components/DynamicComposition";
import type { CompositionData, SceneData } from "../../types";

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
  const [theme, setTheme] = useState<"light" | "dark">(
    typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)")?.matches
      ? "dark" : "light"
  );
  const ref = useRef<PlayerRef>(null);

  useApp({
    appInfo: { name: "Remotion", version: "1.0.0" },
    capabilities: {},
    onAppCreated: (app) => {
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

  return (
    <div style={{ borderRadius: 8, overflow: "hidden", background: bg, fontFamily: "system-ui, sans-serif" }}>
      <div style={{ padding: "8px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", background: bg2, borderBottom: `1px solid ${bd}` }}>
        <span style={{ color: fg, fontSize: 13, fontWeight: 500 }}>
          {meta.title}{isStreaming ? ` (${sceneCount} scene${sceneCount !== 1 ? "s" : ""}...)` : ""}
        </span>
        {!isStreaming && (
          <span style={{ color: fg2, fontSize: 11 }}>
            {meta.width}x{meta.height} · {meta.fps}fps · {sceneCount} scene{sceneCount !== 1 ? "s" : ""} · {(dur / meta.fps).toFixed(1)}s
          </span>
        )}
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
