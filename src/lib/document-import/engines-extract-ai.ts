import "server-only";

import { z } from "zod";

import {
  callOpenRouterJson,
  type OpenRouterMessage,
} from "@/infrastructure/openrouter/chat-completions.server";
import { prepareVisionImageDataUrl } from "@/infrastructure/openrouter/prepare-vision-image.server";

export const enginesExtractSchema = z.object({
  engines: z
    .array(
      z.object({
        serialCode: z.coerce.string().optional().default(""),
        brandName: z.coerce.string().optional().default(""),
        engineCode: z.coerce.string().optional().default(""),
        configuration: z.coerce.string().optional().default(""),
        notes: z.coerce.string().optional().default(""),
        quantity: z.coerce.number().optional().default(1),
        transmission: z.coerce.string().optional().default(""),
        vin: z.coerce.string().optional().default(""),
        price: z
          .union([z.coerce.number(), z.null()])
          .optional()
          .nullable()
          .transform((value) => (value === undefined ? null : value)),
        compatibility: z.coerce.string().optional().default(""),
        confidence: z.coerce
          .number()
          .optional()
          .default(0.6)
          .transform((value) => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0.6))),
      }),
    )
    .default([]),
});

export type EnginesExtractResult = z.infer<typeof enginesExtractSchema>;

export const ENGINES_EXTRACT_SYSTEM_PROMPT = `Ты извлекаешь позиции двигателей / агрегатов из фото или таблицы для авторазборки.
Источник может быть: наклейка, бумажный список, Excel/таблица на экране, рукопись.
Верни ТОЛЬКО JSON-объект (без markdown и пояснений):
{ "engines": [ { "serialCode", "brandName", "engineCode", "configuration", "notes", "quantity", "transmission", "vin", "price", "compatibility", "confidence" } ] }
Правила:
- confidence 0..1
- quantity число (≥1), price число или null
- не выдумывай VIN и серийники — если не видно, ""
- если ничего нет: { "engines": [] }`;

/**
 * Shared vision extract used by legacy document-import and import-batch.
 */
export async function extractEnginesFromImage(params: {
  buffer: Buffer;
  fileName?: string;
  mimeHint?: string;
}): Promise<EnginesExtractResult> {
  const prepared = await prepareVisionImageDataUrl(params.buffer, params.mimeHint);
  const messages: OpenRouterMessage[] = [
    { role: "system", content: ENGINES_EXTRACT_SYSTEM_PROMPT },
    {
      role: "user",
      content: [
        {
          type: "text",
          text: `Файл: ${params.fileName ?? "photo"}. Извлеки все двигатели / строки склада (включая таблицу на экране).`,
        },
        { type: "image_url", image_url: { url: prepared.dataUrl } },
      ],
    },
  ];

  return callOpenRouterJson(messages, enginesExtractSchema, {
    profile: "importVision",
  });
}
