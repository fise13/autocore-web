import "server-only";

import {
  scanDisambiguateResponseSchema,
  scanOcrResponseSchema,
  type ScanDisambiguateResponse,
  type ScanOcrResponse,
} from "./scan-ai-schemas";

const DEFAULT_MODEL = "google/gemini-2.0-flash-001";

function readOpenRouterKey(): string | null {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  return key || null;
}

type OpenRouterMessage =
  | { role: "system" | "user"; content: string }
  | {
      role: "user";
      content: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }>;
    };

async function callOpenRouterJson<T>(
  messages: OpenRouterMessage[],
  schema: { parse: (value: unknown) => T },
): Promise<T> {
  const apiKey = readOpenRouterKey();
  if (!apiKey) {
    throw new Error("AI сканирование не настроено. Задайте OPENROUTER_API_KEY.");
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "https://app.myautocore.com",
      "X-Title": "AutoCore Scan",
    },
    body: JSON.stringify({
      model: process.env.SCAN_AI_MODEL?.trim() || DEFAULT_MODEL,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `OpenRouter error ${response.status}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("Пустой ответ AI");

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("AI вернул некорректный JSON");
  }

  return schema.parse(parsed);
}

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
  );
}
