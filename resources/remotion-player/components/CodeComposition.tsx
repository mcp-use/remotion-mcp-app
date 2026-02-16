import React, { useMemo } from "react";
import * as ReactModule from "react";
import * as ReactJsxRuntimeModule from "react/jsx-runtime";
import * as ReactJsxDevRuntimeModule from "react/jsx-dev-runtime";
import * as RemotionModule from "remotion";
import { RUNTIME_BUNDLE_GLOBAL, RUNTIME_PACKAGE_GLOBAL } from "../../../types";

export type RuntimeMetadataInput = {
  props: Record<string, unknown>;
  defaultProps: Record<string, unknown>;
  compositionId: string;
  abortSignal?: AbortSignal;
};

export type CompiledBundle = {
  component: React.ComponentType<Record<string, unknown>>;
  calculateMetadata?: (input: RuntimeMetadataInput) => unknown | Promise<unknown>;
};

const runtimePackages: Record<string, Record<string, unknown>> = {
  react: ReactModule as Record<string, unknown>,
  "react/jsx-runtime": ReactJsxRuntimeModule as Record<string, unknown>,
  "react/jsx-dev-runtime": ReactJsxDevRuntimeModule as Record<string, unknown>,
  remotion: RemotionModule as Record<string, unknown>,
};

function ensureRuntimePackages(): void {
  const root = globalThis as Record<string, unknown>;
  const existing = root[RUNTIME_PACKAGE_GLOBAL];

  if (existing && typeof existing === "object") {
    Object.assign(existing as Record<string, unknown>, runtimePackages);
    return;
  }

  root[RUNTIME_PACKAGE_GLOBAL] = runtimePackages;
}

ensureRuntimePackages();

type RuntimeExports = {
  default?: unknown;
  calculateMetadata?: unknown;
};

export function compileBundle(bundleCode: string): CompiledBundle | { error: string } {
  try {
    const evaluator = new Function(
      `${bundleCode}\nreturn typeof ${RUNTIME_BUNDLE_GLOBAL} !== \"undefined\" ? ${RUNTIME_BUNDLE_GLOBAL} : null;`
    );

    const exports = evaluator() as RuntimeExports | null;

    if (!exports || typeof exports !== "object") {
      return { error: "Compilation error: bundle did not return exports." };
    }

    if (typeof exports.default !== "function") {
      return {
        error:
          "Compilation error: entry module must export a default React component (export default function ...).",
      };
    }

    return {
      component: exports.default as React.ComponentType<Record<string, unknown>>,
      calculateMetadata:
        typeof exports.calculateMetadata === "function"
          ? (exports.calculateMetadata as (input: RuntimeMetadataInput) => unknown | Promise<unknown>)
          : undefined,
    };
  } catch (error) {
    return { error: `Compilation error: ${(error as Error).message}` };
  }
}

export const CodeComposition: React.FC<{
  bundle: string;
  componentProps: Record<string, unknown>;
}> = ({ bundle, componentProps }) => {
  const compiled = useMemo(() => compileBundle(bundle), [bundle]);

  if ("error" in compiled) {
    throw new Error(compiled.error);
  }

  const Component = compiled.component;
  return <Component {...componentProps} />;
};
