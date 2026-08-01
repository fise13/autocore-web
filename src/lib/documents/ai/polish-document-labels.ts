import "server-only";

import { createHash } from "node:crypto";
import { z } from "zod";

import type { WorkOrderMotorLine, WorkOrderPartLine } from "@/domain/work-order";
import {
  callOpenRouterJson,
  readAiTransport,
} from "@/infrastructure/openrouter/chat-completions.server";
import {
  GEARBOX_MARK,
  polishMotorFieldsDeterministic,
  polishPartNameDeterministic,
  type PolishedMotorFields,
  type PolishedPartFields,
} from "@/lib/documents/ai/document-label-rules";

const motorPolishSchema = z.object({
  id: z.string(),
  brandName: z.string().optional().default(""),
  engineCode: z.string().optional().default(""),
  configuration: z.string().optional().default(""),
  serialCode: z.string().optional().default(""),
  marks: z.array(z.string()).optional().default([]),
  displayTitle: z.string().optional().default(""),
});

const partPolishSchema = z.object({
  id: z.string(),
  name: z.string().optional().default(""),
  marks: z.array(z.string()).optional().default([]),
});

const polishResponseSchema = z.object({
  motors: z.array(motorPolishSchema).optional().default([]),
  parts: z.array(partPolishSchema).optional().default([]),
});

export type DocumentLabelPolishResult = {
  motors: Record<string, PolishedMotorFields>;
  parts: Record<string, PolishedPartFields>;
  source: "deterministic" | "ai";
};

const CACHE_TTL_MS = 5 * 60_000;
const CACHE_MAX = 64;
const polishCache = new Map<string, { expiresAt: number; value: DocumentLabelPolishResult }>();

const SYSTEM_PROMPT = `
You polish motor and part labels for customer-facing PDF documents (warranty, service report, invoice) for an auto dismantling / service business in CIS (Russian language).

Goals:
- Fix transliteration and garbage like "S KOROBKOY", "s korobkoy" → put mark "с коробкой", NEVER leave that phrase inside brand/engine/configuration/displayTitle.
- Remove duplicate tokens ("BMW BMW" → "BMW").
- Keep real brand, engine code, serial unchanged in meaning — do NOT invent missing brand/engine/serial.
- configuration = real комплектация only (e.g. "полный", "голый"), empty if unknown or was only gearbox phrase.
- marks: short Russian customer marks only (prefer exactly "с коробкой" when gearbox presence is indicated).
- displayTitle: clean human title for PDF line — brand + engine code (+ configuration if useful). No serial unless that is all that exists. No "S KOROBKOY".
- Part names: clean similarly; gearbox phrases → marks, not in name.

Return strict JSON: { "motors": [...], "parts": [...] } matching the ids given.
`.trim();

const DIRTY_LABEL_RE = /korobk|bmw\s+bmw|·|с\s*короб/i;

function cacheKey(motors: WorkOrderMotorLine[], parts: WorkOrderPartLine[]): string {
  const payload = JSON.stringify({
    motors: motors.map((m) => ({
      id: m.id,
      brandName: m.brandName,
      engineCode: m.engineCode,
      configuration: m.configuration,
      serialCode: m.serialCode,
    })),
    parts: parts.map((p) => ({ id: p.id, name: p.name })),
  });
  return createHash("sha256").update(payload).digest("hex");
}

function readCache(key: string): DocumentLabelPolishResult | null {
  const hit = polishCache.get(key);
  if (!hit) return null;
  if (hit.expiresAt < Date.now()) {
    polishCache.delete(key);
    return null;
  }
  return hit.value;
}

function writeCache(key: string, value: DocumentLabelPolishResult) {
  if (polishCache.size >= CACHE_MAX) {
    const oldest = polishCache.keys().next().value;
    if (oldest) polishCache.delete(oldest);
  }
  polishCache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, value });
}

function normalizeMark(mark: string): string {
  const trimmed = mark.trim();
  if (!trimmed) return "";
  if (/korobk|с\s*короб/i.test(trimmed)) return GEARBOX_MARK;
  return trimmed;
}

function mergeMarks(...lists: Array<string[] | undefined>): string[] {
  const out: string[] = [];
  for (const list of lists) {
    for (const raw of list ?? []) {
      const mark = normalizeMark(raw);
      if (!mark) continue;
      if (out.some((m) => m.toLowerCase() === mark.toLowerCase())) continue;
      out.push(mark);
    }
  }
  return out;
}

function deterministicResult(
  motors: WorkOrderMotorLine[],
  parts: WorkOrderPartLine[],
): DocumentLabelPolishResult {
  const motorMap: Record<string, PolishedMotorFields> = {};
  for (const line of motors) {
    motorMap[line.id] = polishMotorFieldsDeterministic(line);
  }
  const partMap: Record<string, PolishedPartFields> = {};
  for (const line of parts) {
    partMap[line.id] = polishPartNameDeterministic(line.name);
  }
  return { motors: motorMap, parts: partMap, source: "deterministic" };
}

function labelsLookDirty(motors: WorkOrderMotorLine[], parts: WorkOrderPartLine[]): boolean {
  for (const line of motors) {
    const blob = [line.brandName, line.engineCode, line.configuration, line.serialCode].join(" ");
    if (DIRTY_LABEL_RE.test(blob)) return true;
  }
  for (const line of parts) {
    if (DIRTY_LABEL_RE.test(line.name)) return true;
  }
  return false;
}

function mergeAiMotor(
  base: PolishedMotorFields,
  ai: z.infer<typeof motorPolishSchema> | undefined,
): PolishedMotorFields {
  if (!ai) return base;
  const brandName = (ai.brandName || base.brandName).trim();
  const engineCode = (ai.engineCode || base.engineCode).trim();
  const configuration = (ai.configuration ?? base.configuration).trim();
  const serialCode = (ai.serialCode || base.serialCode).trim();
  const marks = mergeMarks(base.marks, ai.marks);
  const cleaned = polishMotorFieldsDeterministic({
    brandName,
    engineCode,
    configuration,
    serialCode,
  });
  const displayTitle =
    (ai.displayTitle || cleaned.displayTitle || base.displayTitle).trim() || cleaned.displayTitle;
  const displayClean = polishPartNameDeterministic(displayTitle);
  return {
    ...cleaned,
    marks: mergeMarks(cleaned.marks, marks, displayClean.marks),
    displayTitle: displayClean.name || cleaned.displayTitle,
  };
}

/**
 * Polish motor/part labels for PDF render. Always applies deterministic cleanup;
 * optionally refines via OpenRouter when API key is set and labels look dirty.
 */
export async function polishDocumentLabels(input: {
  motors: WorkOrderMotorLine[];
  parts: WorkOrderPartLine[];
}): Promise<DocumentLabelPolishResult> {
  const { motors, parts } = input;
  if (motors.length === 0 && parts.length === 0) {
    return { motors: {}, parts: {}, source: "deterministic" };
  }

  const key = cacheKey(motors, parts);
  const cached = readCache(key);
  if (cached) return cached;

  const base = deterministicResult(motors, parts);

  if (!readAiTransport() || !labelsLookDirty(motors, parts)) {
    writeCache(key, base);
    return base;
  }

  try {
    const userPayload = {
      motors: motors.map((m) => ({
        id: m.id,
        brandName: m.brandName ?? "",
        engineCode: m.engineCode ?? "",
        configuration: m.configuration ?? "",
        serialCode: m.serialCode ?? "",
        deterministic: base.motors[m.id],
      })),
      parts: parts.map((p) => ({
        id: p.id,
        name: p.name,
        deterministic: base.parts[p.id],
      })),
    };

    const ai = await callOpenRouterJson(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: JSON.stringify(userPayload) },
      ],
      polishResponseSchema,
      { profile: "documentPolish" },
    );

    const aiMotorsById = new Map(ai.motors.map((row) => [row.id, row]));
    const aiPartsById = new Map(ai.parts.map((row) => [row.id, row]));

    const merged: DocumentLabelPolishResult = {
      source: "ai",
      motors: {},
      parts: {},
    };

    for (const line of motors) {
      merged.motors[line.id] = mergeAiMotor(base.motors[line.id]!, aiMotorsById.get(line.id));
    }

    for (const line of parts) {
      const det = base.parts[line.id]!;
      const aiPart = aiPartsById.get(line.id);
      if (!aiPart) {
        merged.parts[line.id] = det;
        continue;
      }
      const name = (aiPart.name || det.name).trim() || det.name;
      const cleaned = polishPartNameDeterministic(name);
      merged.parts[line.id] = {
        name: cleaned.name,
        marks: mergeMarks(det.marks, aiPart.marks, cleaned.marks),
      };
    }

    writeCache(key, merged);
    return merged;
  } catch (error) {
    console.warn("[documents/ai] label polish fallback to deterministic", error);
    writeCache(key, base);
    return base;
  }
}
