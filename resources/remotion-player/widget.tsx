import React, { useMemo, useRef } from "react";
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

// @ts-expect-error - Zod v4 deep type instantiation
export const widgetMetadata: WidgetMetadata = {
  description: "Interactive Remotion video player",
  props: propSchema,
  exposeAsTool: false,
  metadata: {
    prefersBorder: true,
    autoResize: true,
    widgetDescription: "Renders a live Remotion video composition",
    csp: {
      resourceDomains: [
        "https://images.unsplash.com",
        "https://picsum.photos",
      ],
    },
  },
};

function calcDuration(scenes: SceneData[]): number {
  let t = 0;
  for (let i = 0; i < scenes.length; i++) {
    t += scenes[i].durationInFrames;
    if (i < scenes.length - 1 && scenes[i].transition)
      t -= scenes[i].transition!.durationInFrames;
  }
  return Math.max(t, 1);
}

function parseComposition(
  widgetProps: Partial<{ composition: string }>,
  toolInput: Record<string, unknown> | undefined
): CompositionData | null {
  // From widget props
  if (widgetProps?.composition) {
    try { return JSON.parse(widgetProps.composition); } catch { /* noop */ }
  }
  // From toolInput
  if (toolInput?.scenes) {
    let scenes: SceneData[] = [];
    const raw = toolInput.scenes;
    if (typeof raw === "string") {
      try { scenes = JSON.parse(raw); } catch { /* noop */ }
    } else if (Array.isArray(raw)) {
      scenes = raw;
    }
    if (scenes.length > 0) {
      return {
        meta: {
          title: (toolInput.title as string) || "Untitled",
          width: (toolInput.width as number) || 1920,
          height: (toolInput.height as number) || 1080,
          fps: (toolInput.fps as number) || 30,
        },
        scenes,
      };
    }
  }
  return null;
}

const RemotionPlayerWidget: React.FC = () => {
  const { props, isPending, theme, toolInput } = useWidget();
  const playerRef = useRef<PlayerRef>(null);

  const composition = useMemo(
    () => parseComposition(
      props as Partial<{ composition: string }>,
      toolInput as Record<string, unknown> | undefined
    ),
    [props, toolInput]
  );

  const duration = useMemo(
    () => composition?.scenes ? calcDuration(composition.scenes) : 1,
    [composition?.scenes]
  );

  const isDark = theme === "dark";
  const bg = isDark ? "#141414" : "#fff";
  const bg2 = isDark ? "#1c1c1c" : "#f5f5f5";
  const fg = isDark ? "#e0e0e0" : "#1a1a1a";
  const fg2 = isDark ? "#777" : "#888";
  const border = isDark ? "#2a2a2a" : "#e0e0e0";

  if (isPending || !composition) {
    return (
      <McpUseProvider autoSize>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          minHeight: 200, background: bg, borderRadius: 8,
          fontFamily: "system-ui, sans-serif", color: fg2, fontSize: 13,
        }}>
          {isPending ? "Creating..." : "No data"}
        </div>
      </McpUseProvider>
    );
  }

  const { meta, scenes } = composition;

  return (
    <McpUseProvider autoSize>
      <div style={{ borderRadius: 8, overflow: "hidden", background: bg, fontFamily: "system-ui, sans-serif" }}>
        <div style={{
          padding: "8px 14px", display: "flex", alignItems: "center",
          justifyContent: "space-between", background: bg2,
          borderBottom: `1px solid ${border}`,
        }}>
          <span style={{ color: fg, fontSize: 13, fontWeight: 500 }}>{meta.title}</span>
          <span style={{ color: fg2, fontSize: 11 }}>
            {meta.width}x{meta.height} &middot; {meta.fps}fps &middot; {scenes.length} scene{scenes.length !== 1 ? "s" : ""} &middot; {(duration / meta.fps).toFixed(1)}s
          </span>
        </div>
        <div style={{ background: "#000" }}>
          <Player
            ref={playerRef}
            component={DynamicComposition}
            inputProps={{ scenes }}
            durationInFrames={duration}
            fps={meta.fps}
            compositionWidth={meta.width}
            compositionHeight={meta.height}
            controls
            autoPlay
            loop
            style={{ width: "100%" }}
          />
        </div>
      </div>
    </McpUseProvider>
  );
};

export default RemotionPlayerWidget;
