import React, { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { z } from "zod";
import { McpUseProvider, useWidget, type WidgetMetadata } from "mcp-use/react";
import { Player, type PlayerRef } from "@remotion/player";
import { DynamicComposition } from "./components/DynamicComposition";
import { EditorLayout } from "./components/editor/EditorLayout";
import { getEditorTheme } from "./components/editor/EditorControls";
import { useCompositionEditor } from "./components/editor/useCompositionEditor";
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

type WidgetProps = z.infer<typeof propSchema>;

const RemotionPlayerWidget: React.FC = () => {
  const {
    props,
    isPending,
    theme,
    sendFollowUpMessage,
    requestDisplayMode,
    toolInput,
  } = useWidget();
  const playerRef = useRef<PlayerRef>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const widgetProps = props as Partial<WidgetProps>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawInput = toolInput as any;

  const composition = useMemo<CompositionData | null>(() => {
    // Strategy 1: widget-specific props (contains pre-built composition JSON)
    if (widgetProps?.composition) {
      try {
        setParseError(null);
        return JSON.parse(widgetProps.composition);
      } catch (e) {
        setParseError("Failed to parse composition data");
        return null;
      }
    }

    // Strategy 2: reconstruct from toolInput (raw tool arguments)
    // This is the fallback for environments where widget props don't arrive
    // but the original tool arguments (title, scenes, etc.) are available.
    if (rawInput?.scenes) {
      try {
        setParseError(null);
        const parsedScenes =
          typeof rawInput.scenes === "string"
            ? JSON.parse(rawInput.scenes)
            : rawInput.scenes;
        return {
          meta: {
            title: rawInput.title || "Untitled",
            width: rawInput.width || 1920,
            height: rawInput.height || 1080,
            fps: rawInput.fps || 30,
          },
          scenes: parsedScenes,
        };
      } catch (e) {
        setParseError("Failed to parse scene data");
        return null;
      }
    }

    return null;
  }, [widgetProps?.composition, rawInput?.scenes, rawInput?.title, rawInput?.width, rawInput?.height, rawInput?.fps]);

  const totalDuration = useMemo(() => {
    if (!composition?.scenes) return 1;
    return calculateTotalDuration(composition.scenes);
  }, [composition?.scenes]);

  const isDark = theme === "dark";
  const bgPrimary = isDark ? "#16213e" : "#f8f9fa";
  const bgSecondary = isDark ? "#1a1a2e" : "#e9ecef";
  const textPrimary = isDark ? "#e0e0e0" : "#333333";
  const textSecondary = isDark ? "#888888" : "#999999";
  const borderColor = isDark ? "#0f3460" : "#dee2e6";
  const accent = isDark ? "#4a9eff" : "#0066cc";
  const editorColors = getEditorTheme(isDark);

  const enterEditMode = useCallback(async () => {
    try {
      await requestDisplayMode("fullscreen");
    } catch {
      // If requestDisplayMode fails (e.g. not in Apps SDK), still enter edit mode
    }
    setIsEditMode(true);
  }, [requestDisplayMode]);

  const exitEditMode = useCallback(async () => {
    setIsEditMode(false);
    try {
      await requestDisplayMode("inline");
    } catch {
      // Ignore errors
    }
  }, [requestDisplayMode]);

  if (isPending) {
    return (
      <McpUseProvider autoSize>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 280,
            backgroundColor: bgPrimary,
            borderRadius: 12,
            fontFamily: "sans-serif",
          }}
        >
          <div style={{ textAlign: "center", color: textSecondary }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>&#127916;</div>
            <div style={{ fontSize: 14 }}>Creating composition...</div>
          </div>
        </div>
      </McpUseProvider>
    );
  }

  if (parseError || !composition) {
    return (
      <McpUseProvider autoSize>
        <div
          style={{
            padding: 24,
            textAlign: "center",
            color: "#e74c3c",
            backgroundColor: isDark ? "#2d1f1f" : "#fff5f5",
            borderRadius: 12,
            fontFamily: "sans-serif",
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 8 }}>&#9888;&#65039;</div>
          <div>{parseError || "No composition data received"}</div>
        </div>
      </McpUseProvider>
    );
  }

  if (isEditMode) {
    return (
      <McpUseProvider autoSize>
        <EditModeWrapper
          composition={composition}
          colors={editorColors}
          sendFollowUpMessage={sendFollowUpMessage}
          onClose={exitEditMode}
        />
      </McpUseProvider>
    );
  }

  // View Mode
  const meta = composition.meta || {
    title: "Untitled",
    width: 1920,
    height: 1080,
    fps: 30,
  };
  const sceneCount = composition.scenes?.length || 0;
  const durationSec = (totalDuration / meta.fps).toFixed(1);

  return (
    <McpUseProvider autoSize>
      <div
        style={{
          borderRadius: 12,
          overflow: "hidden",
          backgroundColor: bgPrimary,
          fontFamily: "sans-serif",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "10px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: bgSecondary,
            borderBottom: `1px solid ${borderColor}`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: textPrimary,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <span style={{ fontSize: 16 }}>&#127916;</span>
            <span>{meta.title}</span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              fontSize: 11,
              color: textSecondary,
            }}
          >
            <span>
              {meta.width}x{meta.height}
            </span>
            <span>{meta.fps}fps</span>
            <span>
              {sceneCount} scene{sceneCount !== 1 ? "s" : ""}
            </span>
            <span>{durationSec}s</span>
            <button
              onClick={enterEditMode}
              style={{
                padding: "4px 10px",
                fontSize: 11,
                fontWeight: 600,
                border: `1px solid ${accent}`,
                borderRadius: 4,
                cursor: "pointer",
                backgroundColor: "transparent",
                color: accent,
                fontFamily: "inherit",
                transition: "background-color 0.15s",
              }}
            >
              &#9998; Edit
            </button>
          </div>
        </div>

        {/* Player */}
        <div style={{ backgroundColor: "#000" }}>
          <Player
            ref={playerRef}
            component={DynamicComposition}
            inputProps={{ scenes: composition.scenes || [] }}
            durationInFrames={totalDuration}
            fps={meta.fps}
            compositionWidth={meta.width}
            compositionHeight={meta.height}
            controls
            autoPlay
            loop
            style={{
              width: "100%",
            }}
          />
        </div>
      </div>
    </McpUseProvider>
  );
};

/**
 * Wrapper that initializes the composition editor hook
 * and bridges it to EditorLayout. Separated so useCompositionEditor
 * doesn't run until we're actually in edit mode.
 */
const EditModeWrapper: React.FC<{
  composition: CompositionData;
  colors: ReturnType<typeof getEditorTheme>;
  sendFollowUpMessage: (prompt: string) => Promise<void>;
  onClose: () => void;
}> = ({ composition, colors, sendFollowUpMessage, onClose }) => {
  const editor = useCompositionEditor(composition);

  // When new composition arrives from AI, reset the editor
  useEffect(() => {
    editor.resetTo(composition);
  }, [composition]);

  const handleSendToAI = useCallback(async () => {
    const json = editor.getJSON();
    const prompt = `Here is the updated composition I've edited. Please review my changes and continue iterating on it:\n\n\`\`\`json\n${json}\n\`\`\`\n\nPlease call create_composition with these updated scenes to apply the changes.`;
    try {
      await sendFollowUpMessage(prompt);
    } catch {
      // Fallback: if sendFollowUpMessage is unavailable, at least we tried
    }
  }, [editor, sendFollowUpMessage]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        minHeight: 500,
      }}
    >
      <EditorLayout
        composition={editor.composition}
        selectedSceneIndex={editor.selectedSceneIndex}
        selectedElementId={editor.selectedElementId}
        isDirty={editor.isDirty}
        onSelectScene={editor.setSelectedSceneIndex}
        onSelectElement={editor.setSelectedElementId}
        onUpdateScene={editor.updateScene}
        onUpdateElement={editor.updateElement}
        onRemoveElement={editor.removeElement}
        onSendToAI={handleSendToAI}
        onClose={onClose}
        colors={colors}
      />
    </div>
  );
};

export default RemotionPlayerWidget;
