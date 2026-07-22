import "server-only";

import { callOpenRouterJson } from "@/infrastructure/openrouter/chat-completions.server";
import { prepareVisionImageDataUrl } from "@/infrastructure/openrouter/prepare-vision-image.server";
import {
  scanDisambiguateResponseSchema,
  scanOcrResponseSchema,
  type ScanDisambiguateResponse,
  type ScanOcrResponse,
} from "./scan-ai-schemas";

export async function runScanOcr(imageBase64: string, mimeType: string): Promise<ScanOcrResponse> {
  const raw = Buffer.from(imageBase64, "base64");
  const prepared = await prepareVisionImageDataUrl(raw, mimeType);

  return callOpenRouterJson(
    [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `You are an OCR engine for automotive parts.
Return ONLY JSON: { "rawText": string, "barcodes": string[], "partNumbers": string[], "brand"?: string, "confidence": number, "warnings": string[] }.
Transcribe visible text exactly into rawText. Extract barcodes, VINs, and part numbers only if visible. Do not invent fields.`,
          },
          { type: "image_url", image_url: { url: prepared.dataUrl } },
        ],
      },
    ],
    scanOcrResponseSchema,
    { profile: "scanOcr" },
  );
}

export async function runScanDisambiguate(
  systemPrompt: string,
  userPrompt: string,
): Promise<ScanDisambiguateResponse> {
  return callOpenRouterJson(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    scanDisambiguateResponseSchema,
    { profile: "scanDisambiguate" },
  );
}
