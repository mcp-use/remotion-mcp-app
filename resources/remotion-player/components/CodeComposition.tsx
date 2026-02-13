import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
import {
  useCurrentFrame, useVideoConfig, interpolate, spring,
  AbsoluteFill, Sequence, Img, Easing,
} from "remotion";
import { TransitionSeries, linearTiming, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { flip } from "@remotion/transitions/flip";

const PARAM_NAMES = [
  "React", "useState", "useMemo", "useEffect", "useCallback", "useRef",
  "useCurrentFrame", "useVideoConfig", "interpolate", "spring", "Easing",
  "AbsoluteFill", "Sequence", "Img",
  "TransitionSeries", "linearTiming", "springTiming",
  "fade", "slide", "wipe", "flip",
];

const PARAM_VALUES = [
  React, useState, useMemo, useEffect, useCallback, useRef,
  useCurrentFrame, useVideoConfig, interpolate, spring, Easing,
  AbsoluteFill, Sequence, Img,
  TransitionSeries, linearTiming, springTiming,
  fade, slide, wipe, flip,
];

function compileCode(code: string): React.FC | { error: string } {
  try {
    const factory = new Function(...PARAM_NAMES, code);
    const Component: React.FC = () => factory(...PARAM_VALUES);
    Component.displayName = "CodeComponent";
    return Component;
  } catch (e) {
    return { error: `Compilation error: ${(e as Error).message}` };
  }
}

export const CodeComposition: React.FC<{ code: string }> = ({ code }) => {
  const compiled = useMemo(() => compileCode(code), [code]);

  if ("error" in compiled) {
    throw new Error(compiled.error);
  }

  const Component = compiled;
  return <Component />;
};
