import { z } from "zod";

export const scanOcrResponseSchema = z.object({
  /** Full visible text transcription — used by deterministic document parsers. */
  rawText: z.coerce.string().default(""),
  barcodes: z.array(z.coerce.string()).default([]),
  partNumbers: z.array(z.coerce.string()).default([]),
  brand: z.coerce.string().optional(),
  confidence: z.coerce
    .number()
    .transform((value) => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0.5))),
  warnings: z.array(z.coerce.string()).default([]),
});

export type ScanOcrResponse = z.infer<typeof scanOcrResponseSchema>;

export const scanDisambiguateResponseSchema = z.object({
  itemId: z.union([z.string(), z.null()]).transform((value) => (value === "" ? null : value)),
  confidence: z.coerce
    .number()
    .transform((value) => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0))),
  reasoning: z.coerce.string().default(""),
  warnings: z.array(z.coerce.string()).default([]),
});

export type ScanDisambiguateResponse = z.infer<typeof scanDisambiguateResponseSchema>;
