import type { CSSProperties } from "react";

import {
  DocumentWatermarkBlend,
  DocumentWatermarkConfig,
  DocumentWatermarkPosition,
  DocumentWatermarkType,
  isWatermarkActive,
} from "@/domain/document-watermark-config";

export type DocumentWatermarkRenderModel = {
  active: boolean;
  type: DocumentWatermarkType;
  logoDataUri?: string;
  companyName: string;
  opacity: number;
  scale: number;
  rotation: number;
  position: DocumentWatermarkPosition;
  grayscale: boolean;
  repeatSpacing: number;
  blend: DocumentWatermarkBlend;
  style: CSSProperties;
};

export function watermarkStyleVars(config: DocumentWatermarkConfig): CSSProperties {
  return {
    ["--doc-wm-opacity" as string]: String(config.opacity / 100),
    ["--doc-wm-scale" as string]: `${config.scale}%`,
    ["--doc-wm-rotation" as string]: `${config.rotation}deg`,
    ["--doc-wm-repeat-spacing" as string]: `${config.repeatSpacing}px`,
  };
}

export function buildWatermarkRenderModel(input: {
  config: DocumentWatermarkConfig;
  logoDataUri?: string;
  companyName: string;
}): DocumentWatermarkRenderModel | null {
  if (!isWatermarkActive(input.config)) return null;

  const companyName = input.companyName.trim() || "Компания";
  const hasLogo = Boolean(input.logoDataUri?.trim());

  if (input.config.type === "logo" && !hasLogo) return null;

  return {
    active: true,
    type: input.config.type,
    logoDataUri: input.logoDataUri,
    companyName,
    opacity: input.config.opacity,
    scale: input.config.scale,
    rotation: input.config.rotation,
    position: input.config.position,
    grayscale: input.config.grayscale,
    repeatSpacing: input.config.repeatSpacing,
    blend: input.config.blend,
    style: watermarkStyleVars(input.config),
  };
}
