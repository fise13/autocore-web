import { DocumentTheme } from "@/domain/company-branding";

export const DOCUMENT_WATERMARK_TYPES = ["none", "logo", "brand_mark", "pattern"] as const;
export type DocumentWatermarkType = (typeof DOCUMENT_WATERMARK_TYPES)[number];

export const DOCUMENT_WATERMARK_POSITIONS = ["center", "center-left", "center-right"] as const;
export type DocumentWatermarkPosition = (typeof DOCUMENT_WATERMARK_POSITIONS)[number];

export const DOCUMENT_WATERMARK_BLENDS = ["normal", "multiply"] as const;
export type DocumentWatermarkBlend = (typeof DOCUMENT_WATERMARK_BLENDS)[number];

export type DocumentWatermarkConfig = {
  type: DocumentWatermarkType;
  opacity: number;
  scale: number;
  rotation: number;
  position: DocumentWatermarkPosition;
  grayscale: boolean;
  repeatSpacing: number;
  blend: DocumentWatermarkBlend;
};

export const WATERMARK_TYPE_LABELS_RU: Record<DocumentWatermarkType, string> = {
  none: "Без фона",
  logo: "Водяной знак",
  brand_mark: "Бренд-марк",
  pattern: "Повторяющийся узор",
};

export const WATERMARK_POSITION_LABELS_RU: Record<DocumentWatermarkPosition, string> = {
  center: "По центру",
  "center-left": "Центр-слева",
  "center-right": "Центр-справа",
};

export function defaultWatermarkForTheme(theme: DocumentTheme): DocumentWatermarkConfig {
  if (theme === "racing") {
    return {
      type: "logo",
      opacity: 4,
      scale: 55,
      rotation: 30,
      position: "center",
      grayscale: true,
      repeatSpacing: 140,
      blend: "multiply",
    };
  }

  return {
    type: "none",
    opacity: 4,
    scale: 50,
    rotation: 30,
    position: "center",
    grayscale: true,
    repeatSpacing: 140,
    blend: "normal",
  };
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed * 10) / 10));
}

function pickType(value: unknown, fallback: DocumentWatermarkType): DocumentWatermarkType {
  return DOCUMENT_WATERMARK_TYPES.includes(value as DocumentWatermarkType)
    ? (value as DocumentWatermarkType)
    : fallback;
}

function pickPosition(value: unknown, fallback: DocumentWatermarkPosition): DocumentWatermarkPosition {
  return DOCUMENT_WATERMARK_POSITIONS.includes(value as DocumentWatermarkPosition)
    ? (value as DocumentWatermarkPosition)
    : fallback;
}

function pickBlend(value: unknown, fallback: DocumentWatermarkBlend): DocumentWatermarkBlend {
  return DOCUMENT_WATERMARK_BLENDS.includes(value as DocumentWatermarkBlend)
    ? (value as DocumentWatermarkBlend)
    : fallback;
}

export function clampWatermarkConfig(
  config: DocumentWatermarkConfig,
  type: DocumentWatermarkType = config.type,
): DocumentWatermarkConfig {
  switch (type) {
    case "logo":
      return {
        ...config,
        type,
        opacity: clampNumber(config.opacity, 3, 6, 4),
        scale: clampNumber(config.scale, 35, 70, 55),
        rotation: clampNumber(config.rotation, 25, 35, 30),
      };
    case "brand_mark":
      return {
        ...config,
        type,
        opacity: clampNumber(config.opacity, 1, 3, 2),
        scale: clampNumber(config.scale, 70, 120, 95),
        rotation: clampNumber(config.rotation, -8, 8, 0),
      };
    case "pattern":
      return {
        ...config,
        type,
        opacity: clampNumber(config.opacity, 1, 2, 1.5),
        scale: clampNumber(config.scale, 35, 70, 45),
        rotation: clampNumber(config.rotation, 0, 0, 0),
        repeatSpacing: clampNumber(config.repeatSpacing, 80, 220, 140),
      };
    case "none":
    default:
      return { ...config, type: "none" };
  }
}

export function parseDocumentWatermarkConfig(
  data: Record<string, unknown> | null | undefined,
  theme: DocumentTheme = "modern",
): DocumentWatermarkConfig {
  const defaults = defaultWatermarkForTheme(theme);
  const raw = data?.documentWatermark;

  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const record = raw as Record<string, unknown>;
    const parsed: DocumentWatermarkConfig = {
      type: pickType(record.type, defaults.type),
      opacity: clampNumber(record.opacity, 1, 6, defaults.opacity),
      scale: clampNumber(record.scale, 35, 120, defaults.scale),
      rotation: clampNumber(record.rotation, -8, 35, defaults.rotation),
      position: pickPosition(record.position, defaults.position),
      grayscale: typeof record.grayscale === "boolean" ? record.grayscale : defaults.grayscale,
      repeatSpacing: clampNumber(record.repeatSpacing, 80, 220, defaults.repeatSpacing),
      blend: pickBlend(record.blend, defaults.blend),
    };
    return clampWatermarkConfig(parsed, parsed.type);
  }

  if (data?.documentLogoBackground === true) {
    return clampWatermarkConfig(
      {
        ...defaults,
        type: "logo",
        opacity: theme === "racing" ? 4 : 4,
        scale: theme === "racing" ? 55 : 50,
        rotation: 30,
        blend: theme === "racing" ? "multiply" : "normal",
      },
      "logo",
    );
  }

  return clampWatermarkConfig(defaults, defaults.type);
}

export function ensureDocumentWatermarkConfig(
  input: Partial<DocumentWatermarkConfig> | null | undefined,
  theme: DocumentTheme = "modern",
): DocumentWatermarkConfig {
  if (input?.type) {
    const base = defaultWatermarkForTheme(theme);
    return clampWatermarkConfig(
      {
        type: input.type,
        opacity: input.opacity ?? base.opacity,
        scale: input.scale ?? base.scale,
        rotation: input.rotation ?? base.rotation,
        position: input.position ?? base.position,
        grayscale: input.grayscale ?? base.grayscale,
        repeatSpacing: input.repeatSpacing ?? base.repeatSpacing,
        blend: input.blend ?? base.blend,
      },
      input.type,
    );
  }

  return parseDocumentWatermarkConfig(undefined, theme);
}

export function isWatermarkActive(config: DocumentWatermarkConfig): boolean {
  return config.type !== "none";
}
