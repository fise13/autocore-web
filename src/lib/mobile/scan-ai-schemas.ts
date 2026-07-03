import { z } from "zod";

export const scanOcrResponseSchema = z.object({
  barcodes: z.array(z.string()).default([]),
  partNumbers: z.array(z.string()).default([]),
  brand: z.string().optional(),
  confidence: z.number().min(0).max(1),
  warnings: z.array(z.string()).default([]),
});

export type ScanOcrResponse = z.infer<typeof scanOcrResponseSchema>;

export const scanDisambiguateResponseSchema = z.object({
  itemId: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  warnings: z.array(z.string()).default([]),
});

export type ScanDisambiguateResponse = z.infer<typeof scanDisambiguateResponseSchema>;
