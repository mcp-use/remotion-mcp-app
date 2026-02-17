import React, {
  useMemo,
  useRef,
  useState,
  useEffect,
  useCallback,
  Component,
  type ErrorInfo,
  type ReactNode,
} from "react";
import { z } from "zod";
import { useWidget, McpUseProvider, type WidgetMetadata } from "mcp-use/react";
import { Player, type PlayerRef } from "@remotion/player";
import { compileBundle } from "./components/CodeComposition";
import type { VideoMeta, VideoProjectData } from "../../types";

import { GrainGradient } from "@paper-design/shaders-react";

// ---------------------------------------------------------------------------
// Error boundaries
// ---------------------------------------------------------------------------

class WidgetErrorBoundary extends Component<
  { children: ReactNode },
  { error: string | null }
> {
  state = { error: null as string | null };

  static getDerivedStateFromError(error: Error) {
    return { error: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[remotion-player] top-level error:", error.message, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 16, color: "#ff6b6b", fontFamily: "monospace", fontSize: 12 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Widget Error</div>
          <div style={{ whiteSpace: "pre-wrap" }}>{this.state.error}</div>
        </div>
      );
    }
    return this.props.children;
  }
}

class PlayerErrorBoundary extends Component<
  { children: ReactNode; onError?: (msg: string) => void; dark: boolean },
  { error: string | null }
> {
  state = { error: null as string | null };

  static getDerivedStateFromError(error: Error) {
    return { error: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError?.(error.message);
    console.error("[remotion-player] player error:", error.message, info.componentStack);
  }

  render() {
    if (this.state.error) {
      const dark = this.props.dark;
      return (
        <div
          style={{
            padding: 16,
            background: dark ? "#1c1c1c" : "#f5f5f5",
            borderRadius: 8,
            fontFamily: "system-ui, sans-serif",
            color: dark ? "#ff6b6b" : "#dc3545",
            fontSize: 13,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Error</div>
          <div style={{ opacity: 0.8, fontSize: 12, fontFamily: "monospace", whiteSpace: "pre-wrap" }}>
            {this.state.error}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ---------------------------------------------------------------------------
// Widget metadata
// ---------------------------------------------------------------------------

const propSchema = z.object({
  videoProject: z
    .string()
    .optional()
    .describe("JSON with bundled project code, composition metadata, defaultProps and inputProps"),
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function positiveNumberOrFallback(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  return fallback;
}

function toPropsObject(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function parseVideoProject(input: Record<string, unknown> | null): VideoProjectData | null {
  if (!input) return null;
  const raw = input.videoProject;
  if (typeof raw !== "string") return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!isRecord(parsed)) return null;
    const meta = parsed.meta;
    const bundle = parsed.bundle;
    if (!isRecord(meta) || typeof bundle !== "string" || bundle.trim().length === 0) return null;
    return {
      meta: {
        title: typeof meta.title === "string" && meta.title.trim().length > 0 ? meta.title : "Untitled",
        compositionId: typeof meta.compositionId === "string" && meta.compositionId.trim().length > 0 ? meta.compositionId : "Main",
        width: positiveNumberOrFallback(meta.width, 1920),
        height: positiveNumberOrFallback(meta.height, 1080),
        fps: positiveNumberOrFallback(meta.fps, 30),
        durationInFrames: positiveNumberOrFallback(meta.durationInFrames, 150),
      },
      bundle,
      defaultProps: toPropsObject(parsed.defaultProps),
      inputProps: toPropsObject(parsed.inputProps),
      compileError:
        typeof parsed.compileError === "string" && parsed.compileError.trim().length > 0
          ? parsed.compileError
          : undefined,
    };
  } catch {
    return null;
  }
}

function mergeProps(
  defaultProps: Record<string, unknown>,
  inputProps: Record<string, unknown>
): Record<string, unknown> {
  return { ...defaultProps, ...inputProps };
}

function readMetadataOverrides(overrides: Record<string, unknown>, fallback: VideoMeta): VideoMeta {
  return {
    ...fallback,
    width: positiveNumberOrFallback(overrides.width, fallback.width),
    height: positiveNumberOrFallback(overrides.height, fallback.height),
    fps: positiveNumberOrFallback(overrides.fps, fallback.fps),
    durationInFrames: positiveNumberOrFallback(overrides.durationInFrames, fallback.durationInFrames),
  };
}

// ---------------------------------------------------------------------------
// Loading words
// ---------------------------------------------------------------------------

const LOADING_WORDS = [
  "Storyboarding", "Keyframing", "Colorgrading", "Montaging", "Clipjuggling",
  "Renderwrangling", "Timeline-taming", "Scene-stitching", "Framebuffing",
  "Beziering", "Rotoscoping", "Whooshing", "Boom-micing", "Greenscreening",
  "Lensfiddling", "Foleying", "Pixel-peeping", "Shot-sweetening",
  "Captionifying", "Transition-wizarding", "Slo-moing", "B-rolling",
  "Audio-polishing", "Stabilizing", "Export-spelunking",
  "Render-re-rendering", "Compiling-and-smiling", "Cinema-cooking",
];

function useLoadingWord(active: boolean) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!active) {
      setVisible(true);
      return;
    }
    const rotateMs = 2500;
    const fadeMs = 220;
    let timeout: number | null = null;
    const interval = window.setInterval(() => {
      setVisible(false);
      timeout = window.setTimeout(() => {
        setIndex((prev) => (prev + 1) % LOADING_WORDS.length);
        setVisible(true);
      }, fadeMs);
    }, rotateMs);
    return () => {
      window.clearInterval(interval);
      if (timeout !== null) window.clearTimeout(timeout);
    };
  }, [active]);

  return { word: LOADING_WORDS[index] + "...", visible };
}

// ---------------------------------------------------------------------------
// Shader background (safe — renders fallback gradient on failure)
// ---------------------------------------------------------------------------

function ShaderBackground({ style }: { style?: React.CSSProperties }) {
  return (
    <GrainGradient
      width="100%"
      height="100%"
      colors={["#7300ff", "#eba8ff", "#00bfff", "#2b00ff", "#33cc99", "#3399cc", "#3333cc"]}
      colorBack="#00000000"
      softness={1}
      intensity={1}
      noise={0.0}
      shape="corners"
      speed={2}
      scale={1.8}
      style={style}
    />
  );
}

// ---------------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------------

function LoadingView({
  word,
  visible,
  dark,
  fullscreen,
  onExitFullscreen,
}: {
  word: string;
  visible: boolean;
  dark: boolean;
  fullscreen: boolean;
  onExitFullscreen?: () => void;
}) {
  const height = fullscreen ? "100vh" : 260;
  return (
    <div
      style={{
        position: "relative",
        height,
        minHeight: 260,
        borderRadius: fullscreen ? 0 : 8,
        overflow: "hidden",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <ShaderBackground style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
      {fullscreen && onExitFullscreen && (
        <div style={{ position: "absolute", top: 10, right: 10, zIndex: 2 }}>
          <button
            onClick={onExitFullscreen}
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "none",
              cursor: "pointer",
              padding: "7px 10px",
              color: "#f4f4f4",
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            Exit fullscreen
          </button>
        </div>
      )}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: dark ? "#ffffff" : "#000000",
          textAlign: "center",
          padding: 24,
        }}
      >
        <span
          style={{
            fontSize: 16,
            fontWeight: 500,
            letterSpacing: 0.35,
            lineHeight: 1,
            opacity: visible ? 0.95 : 0,
            transform: visible ? "translateY(0px) scale(1)" : "translateY(8px) scale(0.985)",
            transition: "opacity 120ms ease, transform 120ms ease",
          }}
        >
          {word}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyView({ dark }: { dark: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 200,
        background: dark ? "#141414" : "#fff",
        borderRadius: 8,
        fontFamily: "system-ui, sans-serif",
        color: dark ? "#777" : "#888",
        fontSize: 13,
        textAlign: "center",
        padding: 16,
      }}
    >
      No video project data was returned. Check the tool output and call create_video or update_video again.
    </div>
  );
}

// ---------------------------------------------------------------------------
// Header bar
// ---------------------------------------------------------------------------

function HeaderBar({
  title,
  dark,
  isFullscreen,
  isAvailable,
  onToggleFullscreen,
}: {
  title: string;
  dark: boolean;
  isFullscreen: boolean;
  isAvailable: boolean;
  onToggleFullscreen: () => void;
}) {
  const fg = dark ? "#e0e0e0" : "#1a1a1a";
  const fg2 = dark ? "#777" : "#888";

  const fsIcon = isFullscreen ? (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 2 6 6 2 6" /><polyline points="10 14 10 10 14 10" />
      <line x1="2" y1="2" x2="6" y2="6" /><line x1="14" y1="14" x2="10" y2="10" />
    </svg>
  ) : (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="10 2 14 2 14 6" /><polyline points="6 14 2 14 2 10" />
      <line x1="14" y1="2" x2="10" y2="6" /><line x1="2" y1="14" x2="6" y2="10" />
    </svg>
  );

  return (
    <div style={{ padding: "6px 10px 6px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
      <span style={{ color: fg, fontSize: 13, fontWeight: 500 }}>{title}</span>
      <button
        onClick={onToggleFullscreen}
        disabled={!isAvailable}
        title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
        style={{
          background: "none",
          border: "none",
          cursor: isAvailable ? "pointer" : "not-allowed",
          padding: 6,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: fg2,
          borderRadius: 4,
          opacity: isAvailable ? 0.7 : 0.35,
        }}
      >
        {fsIcon}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Updating overlay
// ---------------------------------------------------------------------------

function UpdatingOverlay({ word, visible, dark }: { word: string; visible: boolean; dark: boolean }) {
  return (
    <div style={{ position: "absolute", left: 10, right: 10, bottom: 10, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
      <div
        style={{
          background: dark ? "rgba(0,0,0,0.68)" : "rgba(255,255,255,0.9)",
          borderRadius: 999,
          padding: "5px 12px",
          color: dark ? "#f4f4f4" : "#1b1b1b",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: 0.22,
          opacity: visible ? 0.95 : 0,
          transform: visible ? "translateY(0px) scale(1)" : "translateY(6px) scale(0.985)",
          transition: "opacity 120ms ease, transform 120ms ease",
        }}
      >
        {word}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Player view
// ---------------------------------------------------------------------------

function PlayerView({
  compiledProject,
  compileError,
  mergedProps,
  meta,
  dark,
  isBusy,
  isFullscreen,
  loadingWord,
  loadingVisible,
  onPlayerError,
}: {
  compiledProject: ReturnType<typeof compileBundle> | null;
  compileError: string | null;
  mergedProps: Record<string, unknown>;
  meta: VideoMeta;
  dark: boolean;
  isBusy: boolean;
  isFullscreen: boolean;
  loadingWord: string;
  loadingVisible: boolean;
  onPlayerError: (msg: string) => void;
}) {
  const ref = useRef<PlayerRef>(null);

  if (compileError) {
    return (
      <div
        style={{
          padding: 16,
          background: dark ? "#1c1c1c" : "#f5f5f5",
          borderRadius: 8,
          fontFamily: "system-ui, sans-serif",
          color: dark ? "#ff6b6b" : "#dc3545",
          fontSize: 13,
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 4 }}>Compilation Error</div>
        <div style={{ opacity: 0.8, fontSize: 12, fontFamily: "monospace", whiteSpace: "pre-wrap" }}>
          {compileError}
        </div>
      </div>
    );
  }

  if (!compiledProject || "error" in compiledProject) {
    return null;
  }

  return (
    <PlayerErrorBoundary onError={onPlayerError} dark={dark}>
      <div style={{ position: "relative", width: "100%", maxWidth: isFullscreen ? "100%" : undefined, margin: isFullscreen ? "0 auto" : undefined }}>
        <Player
          ref={ref}
          component={compiledProject.component as any}
          inputProps={mergedProps}
          durationInFrames={meta.durationInFrames}
          fps={meta.fps}
          compositionWidth={meta.width}
          compositionHeight={meta.height}
          controls
          autoPlay
          loop
          style={{
            width: "100%",
            maxWidth: "100%",
            maxHeight: isFullscreen ? "calc(100vh - 56px)" : undefined,
            margin: "0 auto",
          }}
        />
        {isBusy && !isFullscreen && (
          <UpdatingOverlay word={loadingWord} visible={loadingVisible} dark={dark} />
        )}
      </div>
    </PlayerErrorBoundary>
  );
}

// ---------------------------------------------------------------------------
// Main widget
// ---------------------------------------------------------------------------

function RemotionPlayerWidgetInner() {
  const {
    props,
    isPending,
    theme,
    displayMode,
    isAvailable,
    isStreaming,
    sendFollowUpMessage,
    requestDisplayMode,
  } = useWidget<z.infer<typeof propSchema>>();

  const prevRef = useRef<VideoProjectData | null>(null);
  const isFullscreen = displayMode === "fullscreen" && isAvailable;
  const dark = theme === "dark";
  const bg = dark ? "#141414" : "#fff";
  const isBusy = isPending || isStreaming;

  // --- Parse project data ---
  const rawVideoProject = useMemo(() => {
    const value = (props as Record<string, unknown> | null)?.videoProject;
    return typeof value === "string" ? value : null;
  }, [props]);

  const finalData = useMemo(() => {
    if (isPending || !rawVideoProject) return null;
    return parseVideoProject({ videoProject: rawVideoProject });
  }, [isPending, rawVideoProject]);

  useEffect(() => {
    if (finalData) prevRef.current = finalData;
  }, [finalData]);

  const data = finalData || (isBusy ? prevRef.current : null);
  const hasData = !!data;
  const isLoading = !hasData && isBusy;

  // --- Loading word ---
  const { word: loadingWord, visible: loadingVisible } = useLoadingWord(isBusy);

  // --- Compile bundle ---
  const compiled = useMemo(() => {
    if (!data || data.compileError) return null;
    return compileBundle(data.bundle);
  }, [data?.bundle, data?.compileError]);

  const compileError = data?.compileError ?? (compiled && "error" in compiled ? compiled.error : null);
  const compiledProject = compiled && !("error" in compiled) ? compiled : null;

  // --- Merge props ---
  const mergedProps = useMemo(() => {
    if (!data) return {};
    return mergeProps(data.defaultProps, data.inputProps);
  }, [data]);

  // --- Resolve metadata (calculateMetadata) ---
  const [resolvedMeta, setResolvedMeta] = useState<VideoMeta | null>(null);

  useEffect(() => {
    if (!data) { setResolvedMeta(null); return; }
    setResolvedMeta(data.meta);
  }, [data?.bundle, data?.meta.title, data?.meta.compositionId, data?.meta.width, data?.meta.height, data?.meta.fps, data?.meta.durationInFrames]);

  useEffect(() => {
    if (!data || !compiled || "error" in compiled || !compiled.calculateMetadata) return;
    const controller = new AbortController();
    Promise.resolve(
      compiled.calculateMetadata({
        props: mergedProps,
        defaultProps: data.defaultProps,
        compositionId: data.meta.compositionId,
        abortSignal: controller.signal,
      })
    )
      .then((metadata) => {
        if (controller.signal.aborted || !isRecord(metadata)) return;
        setResolvedMeta((current) => readMetadataOverrides(metadata, current ?? data.meta));
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        try { sendFollowUpMessage(`calculateMetadata() failed:\n\n\`${(error as Error).message}\`\n\nPlease fix the project and call create_video or update_video again.`); } catch {}
      });
    return () => controller.abort();
  }, [compiled, data, mergedProps, sendFollowUpMessage]);

  // --- Send follow-up on compile error ---
  useEffect(() => {
    if (!compileError || data?.compileError) return;
    try { sendFollowUpMessage(`The project had a compilation error:\n\n\`${compileError}\`\n\nPlease fix the files and call create_video or update_video again.`); } catch {}
  }, [compileError, sendFollowUpMessage]);

  // --- Fullscreen toggle ---
  const toggleFullscreen = useCallback(() => {
    const nextMode = isFullscreen ? "inline" : "fullscreen";
    requestDisplayMode(nextMode).catch((error) => {
      console.error(`[remotion-player] Failed to request display mode "${nextMode}"`, error);
    });
  }, [isFullscreen, requestDisplayMode]);

  // --- Player error handler ---
  const handlePlayerError = useCallback(
    (msg: string) => {
      try { sendFollowUpMessage(`The video had a runtime error:\n\n\`${msg}\`\n\nPlease fix the project and call create_video or update_video again.`); } catch {}
    },
    [sendFollowUpMessage]
  );

  const meta = resolvedMeta ?? data?.meta ?? { title: "Untitled", compositionId: "Main", width: 1920, height: 1080, fps: 30, durationInFrames: 150 };

  // --- Loading state (no data yet, tool is running) ---
  if (isLoading) {
    return (
      <LoadingView
        word={loadingWord}
        visible={loadingVisible}
        dark={dark}
        fullscreen={isFullscreen}
        onExitFullscreen={isFullscreen ? toggleFullscreen : undefined}
      />
    );
  }

  // --- Empty state (no data, tool is done) ---
  if (!hasData) {
    return <EmptyView dark={dark} />;
  }

  // --- Player state ---
  const playerEl = (
    <PlayerView
      compiledProject={compiledProject}
      compileError={compileError}
      mergedProps={mergedProps}
      meta={meta}
      dark={dark}
      isBusy={isBusy}
      isFullscreen={isFullscreen}
      loadingWord={loadingWord}
      loadingVisible={loadingVisible}
      onPlayerError={handlePlayerError}
    />
  );

  if (isFullscreen) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#000", fontFamily: "system-ui, sans-serif" }}>
        <HeaderBar title={meta.title} dark={dark} isFullscreen isAvailable={isAvailable} onToggleFullscreen={toggleFullscreen} />
        {isBusy && (
          <div style={{ display: "flex", justifyContent: "center", padding: "0 14px 8px", pointerEvents: "none" }}>
            <UpdatingOverlay word={loadingWord} visible={loadingVisible} dark={dark} />
          </div>
        )}
        <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "12px 16px 16px", boxSizing: "border-box" }}>
          <div style={{ width: "100%", maxWidth: 1680 }}>{playerEl}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ borderRadius: 8, overflow: "hidden", background: bg, fontFamily: "system-ui, sans-serif" }}>
      <HeaderBar title={meta.title} dark={dark} isFullscreen={false} isAvailable={isAvailable} onToggleFullscreen={toggleFullscreen} />
      {playerEl}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Export with error boundary + provider
// ---------------------------------------------------------------------------

export default function RemotionPlayerWidget() {
  return (
    <McpUseProvider autoSize>
      <WidgetErrorBoundary>
        <RemotionPlayerWidgetInner />
      </WidgetErrorBoundary>
    </McpUseProvider>
  );
}
