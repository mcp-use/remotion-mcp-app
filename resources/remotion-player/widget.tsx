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
import { GrainGradient } from "@paper-design/shaders-react";
import { compileBundle } from "./components/CodeComposition";
import type { VideoMeta, VideoProjectData } from "../../types";

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
    console.error("[remotion]", error.message, info.componentStack);
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
          <div
            style={{
              opacity: 0.8,
              fontSize: 12,
              fontFamily: "monospace",
              whiteSpace: "pre-wrap",
            }}
          >
            {this.state.error}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function positiveNumberOrFallback(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }
  return fallback;
}

function toPropsObject(value: unknown): Record<string, unknown> {
  if (isRecord(value)) {
    return value;
  }
  return {};
}

function parseVideoProject(input: Record<string, unknown> | null): VideoProjectData | null {
  if (!input) {
    return null;
  }

  const raw = input.videoProject;
  if (typeof raw !== "string") {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!isRecord(parsed)) {
      return null;
    }

    const meta = parsed.meta;
    const bundle = parsed.bundle;
    if (!isRecord(meta) || typeof bundle !== "string" || bundle.trim().length === 0) {
      return null;
    }

    const normalizedMeta: VideoMeta = {
      title: typeof meta.title === "string" && meta.title.trim().length > 0 ? meta.title : "Untitled",
      compositionId:
        typeof meta.compositionId === "string" && meta.compositionId.trim().length > 0
          ? meta.compositionId
          : "Main",
      width: positiveNumberOrFallback(meta.width, 1920),
      height: positiveNumberOrFallback(meta.height, 1080),
      fps: positiveNumberOrFallback(meta.fps, 30),
      durationInFrames: positiveNumberOrFallback(meta.durationInFrames, 150),
    };

    return {
      meta: normalizedMeta,
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
    durationInFrames: positiveNumberOrFallback(
      overrides.durationInFrames,
      fallback.durationInFrames
    ),
  };
}

const LOADING_WORDS = [
  "Bamboozleding",
  "Discombobulateding",
  "Cattywampusing",
  "Malarkeying",
  "Brouhahaing",
  "Skedaddleing",
  "Doohickeying",
  "Persnicketying",
  "Whatnoting",
  "Gobsmackeding",
  "Flibbertigibbeting",
  "Tenterhooksing",
  "Poppycocking",
  "Whippersnappering",
  "Flabbergasteding",
  "Shenanigansing",
  "Lollygaging",
  "Kerfuffleing",
  "Nincompooping",
  "Pumpernickeling",
  "Thingamajiging",
  "Whatsiting",
  "Whatchamacalliting",
  "Flummoxeding",
  "Dingleberrying",
  "Gobbledygooking",
  "Canoodling",
  "Codswalloping",
];

export default function RemotionPlayerWidget() {
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

  const ref = useRef<PlayerRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevRef = useRef<VideoProjectData | null>(null);
  const isFullscreen = displayMode === "fullscreen" && isAvailable;

  const rawVideoProject = useMemo(() => {
    const value = (props as Record<string, unknown> | null)?.videoProject;
    return typeof value === "string" ? value : null;
  }, [props]);

  const finalData = useMemo(() => {
    if (isPending || !rawVideoProject) {
      return null;
    }
    return parseVideoProject({ videoProject: rawVideoProject });
  }, [isPending, rawVideoProject]);

  useEffect(() => {
    if (finalData) {
      prevRef.current = finalData;
    }
  }, [finalData]);

  const data = finalData || ((isPending || isStreaming) ? prevRef.current : null);
  const hasData = !!data;
  const isLoading = !hasData && (isPending || isStreaming);
  const [loadingWordIndex, setLoadingWordIndex] = useState(0);
  const [loadingWordVisible, setLoadingWordVisible] = useState(true);

  useEffect(() => {
    if (!isLoading) {
      setLoadingWordVisible(true);
      return;
    }

    const rotateEveryMs = 2500;
    const fadeMs = 220;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const intervalId = window.setInterval(() => {
      setLoadingWordVisible(false);
      timeoutId = window.setTimeout(() => {
        setLoadingWordIndex((prev) => (prev + 1) % LOADING_WORDS.length);
        setLoadingWordVisible(true);
      }, fadeMs);
    }, rotateEveryMs);

    return () => {
      window.clearInterval(intervalId);
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [isLoading]);

  const mergedProps = useMemo(() => {
    if (!data) {
      return {};
    }
    return mergeProps(data.defaultProps, data.inputProps);
  }, [data]);

  const compiled = useMemo(() => {
    if (!data || data.compileError) {
      return null;
    }
    return compileBundle(data.bundle);
  }, [data?.bundle, data?.compileError]);

  const [resolvedMeta, setResolvedMeta] = useState<VideoMeta | null>(null);

  useEffect(() => {
    if (!data) {
      setResolvedMeta(null);
      return;
    }
    setResolvedMeta(data.meta);
  }, [
    data?.bundle,
    data?.meta.title,
    data?.meta.compositionId,
    data?.meta.width,
    data?.meta.height,
    data?.meta.fps,
    data?.meta.durationInFrames,
  ]);

  useEffect(() => {
    if (!data || !compiled || "error" in compiled || !compiled.calculateMetadata) {
      return;
    }

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
        if (controller.signal.aborted || !isRecord(metadata)) {
          return;
        }

        setResolvedMeta((current) => readMetadataOverrides(metadata, current ?? data.meta));
      })
      .catch((error) => {
        if (controller.signal.aborted) {
          return;
        }

        try {
          sendFollowUpMessage(
            `calculateMetadata() failed:\n\n\`${(error as Error).message}\`\n\nPlease fix the project and call create_video or update_video again.`
          );
        } catch {
          // Ignore follow-up failures.
        }
      });

    return () => controller.abort();
  }, [compiled, data, mergedProps, sendFollowUpMessage]);

  const compileError = data?.compileError ?? (compiled && "error" in compiled ? compiled.error : null);
  const compiledProject = compiled && !("error" in compiled) ? compiled : null;

  useEffect(() => {
    if (!compileError || data?.compileError) {
      return;
    }

    try {
      sendFollowUpMessage(
        `The project had a compilation error:\n\n\`${compileError}\`\n\nPlease fix the files and call create_video or update_video again.`
      );
    } catch {
      // Ignore follow-up failures.
    }
  }, [compileError, sendFollowUpMessage]);

  const toggleFullscreen = useCallback(() => {
    const nextMode = isFullscreen ? "inline" : "fullscreen";
    requestDisplayMode(nextMode).catch((error) => {
      console.error(`[remotion] Failed to request display mode "${nextMode}"`, error);
    });
  }, [isFullscreen, requestDisplayMode]);

  const handlePlayerError = useCallback(
    (msg: string) => {
      try {
        sendFollowUpMessage(
          `The video had a runtime error:\n\n\`${msg}\`\n\nPlease fix the project and call create_video or update_video again.`
        );
      } catch {
        // Ignore follow-up failures.
      }
    },
    [sendFollowUpMessage]
  );

  const dark = theme === "dark";
  const bg = dark ? "#141414" : "#fff";
  const fg = dark ? "#e0e0e0" : "#1a1a1a";
  const fg2 = dark ? "#777" : "#888";

  if (!hasData) {
    const statusText =
      "No video project data was returned. Check the tool output and call create_video or update_video again.";

    if (isLoading) {
      return (
        <McpUseProvider autoSize>
          <div
            style={{
              position: "relative",
              minHeight: 260,
              borderRadius: 8,
              overflow: "hidden",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            <GrainGradient
              width="100%"
              height={260}
              colors={["#7300ff", "#eba8ff", "#00bfff", "#2b00ff", "#33cc99", "#3399cc", "#3333cc"]}
              colorBack="#00000000"
              softness={1}
              intensity={1}
              noise={0.0}
              shape="corners"
              speed={2}
              scale={1.8}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
            />
            <div
              style={{
                position: "relative",
                zIndex: 1,
                minHeight: 260,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 0,
                color: dark ? "#ffffff" : "#000000",
                textAlign: "center",
                padding: 20,
                textShadow: "0 1px 2px rgba(255,255,255,0.35)",
              }}
            >
              <div style={{ minHeight: 36, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span
                  style={{
                    fontSize: 16,
                    fontWeight: 500,
                    letterSpacing: 0.35,
                    lineHeight: 1.0,
                    color: dark ? "#ffffff" : "#000000",
                    textShadow: "none",
                    opacity: loadingWordVisible ? 0.95 : 0,
                    transform: loadingWordVisible
                      ? "translateY(0px) scale(1)"
                      : "translateY(8px) scale(0.985)",
                    transition: "opacity 120ms ease, transform 120ms ease",
                  }}
                >
                  {LOADING_WORDS[loadingWordIndex] + "..."}
                </span>
              </div>
            </div>
          </div>
        </McpUseProvider>
      );
    }

    return (
      <McpUseProvider autoSize>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 200,
            background: bg,
            borderRadius: 8,
            fontFamily: "system-ui, sans-serif",
            color: fg2,
            fontSize: 13,
            textAlign: "center",
            padding: 16,
          }}
        >
          {statusText}
        </div>
      </McpUseProvider>
    );
  }

  const meta = resolvedMeta ?? data!.meta;

  const fsIcon = isFullscreen ? (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="6 2 6 6 2 6" />
      <polyline points="10 14 10 10 14 10" />
      <line x1="2" y1="2" x2="6" y2="6" />
      <line x1="14" y1="14" x2="10" y2="10" />
    </svg>
  ) : (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="10 2 14 2 14 6" />
      <polyline points="6 14 2 14 2 10" />
      <line x1="14" y1="2" x2="10" y2="6" />
      <line x1="2" y1="14" x2="6" y2="10" />
    </svg>
  );

  const header = (
    <div
      style={{
        padding: "6px 10px 6px 14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexShrink: 0,
      }}
    >
      <span style={{ color: fg, fontSize: 13, fontWeight: 500 }}>{meta.title}</span>
      <button
        onClick={toggleFullscreen}
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

  const playerEl = (
    <PlayerErrorBoundary onError={handlePlayerError} dark={dark}>
      {compileError ? (
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
          <div
            style={{
              opacity: 0.8,
              fontSize: 12,
              fontFamily: "monospace",
              whiteSpace: "pre-wrap",
            }}
          >
            {compileError}
          </div>
        </div>
      ) : (
        <div
          style={{
            position: "relative",
            width: "100%",
            maxWidth: isFullscreen ? "100%" : undefined,
            margin: isFullscreen ? "0 auto" : undefined,
          }}
        >
          <Player
            ref={ref}
            component={compiledProject?.component as any}
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
          {(isPending || isStreaming) ? (
            <div
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                background: dark ? "rgba(0,0,0,0.7)" : "rgba(255,255,255,0.88)",
                borderRadius: 999,
                padding: "4px 10px",
                color: dark ? "#ddd" : "#333",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: 0.2,
              }}
            >
              Updating preview...
            </div>
          ) : null}
        </div>
      )}
    </PlayerErrorBoundary>
  );

  if (isFullscreen) {
    return (
      <McpUseProvider autoSize>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            height: "100vh",
            background: "#000",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          {header}
          <div
            style={{
              flex: 1,
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "12px 16px 16px",
              boxSizing: "border-box",
            }}
          >
            <div style={{ width: "100%", maxWidth: 1680 }}>{playerEl}</div>
          </div>
        </div>
      </McpUseProvider>
    );
  }

  return (
    <McpUseProvider autoSize>
      <div
        ref={containerRef}
        style={{ borderRadius: 8, overflow: "hidden", background: bg, fontFamily: "system-ui, sans-serif" }}
      >
        {header}
        {playerEl}
      </div>
    </McpUseProvider>
  );
}
