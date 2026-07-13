import "server-only";

import { callOpenRouterJson } from "@/infrastructure/openrouter/chat-completions.server";
import {
  scanDisambiguateResponseSchema,
  scanOcrResponseSchema,
  type ScanDisambiguateResponse,
  type ScanOcrResponse,
} from "./scan-ai-schemas";

export async function runScanOcr(imageBase64: string, mimeType: string): Promise<ScanOcrResponse> {
  const dataUrl = `data:${mimeType};base64,${imageBase64}`;
  return callOpenRouterJson(
    [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "You are an OCR engine. Transcribe all visible text exactly (rawText). Also extract barcodes, VINs, and automotive part numbers. Return JSON: { rawText, barcodes, partNumbers, brand?, confidence, warnings }. Do not classify or invent fields — only extract what is visible.",
          },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ],
    scanOcrResponseSchema,
    {
      title: "AutoCore Scan",
      model: process.env.SCAN_AI_MODEL?.trim(),
    },
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
    {
      title: "AutoCore Scan",
      model: process.env.SCAN_AI_MODEL?.trim(),
    },
  );
}
