import { z } from "zod";

export const columnMapAiResponseSchema = z.object({
  mappings: z.record(z.string(), z.string()),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().optional().default(""),
  warnings: z.array(z.string()).default([]),
});

export const normalizeBatchItemSchema = z.object({
  rowIndex: z.number(),
  normalizedTitle: z.string().optional(),
  brand: z.string().optional(),
  category: z.string().optional(),
  confidence: z.number().min(0).max(1),
  duplicateRisk: z.number().min(0).max(1).optional().default(0),
  warnings: z.array(z.string()).default([]),
});

export const normalizeBatchAiResponseSchema = z.object({
  items: z.array(normalizeBatchItemSchema),
});

export const duplicateClusterAiResponseSchema = z.object({
  clusterId: z.string(),
  suggestedAction: z.enum(["merge", "create", "skip"]),
  targetItemId: z.string().nullable().optional(),
  confidence: z.number().min(0).max(1),
  reasoning: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
});

export type NormalizeBatchItem = z.infer<typeof normalizeBatchItemSchema>;
export type ColumnMapAiResponse = z.infer<typeof columnMapAiResponseSchema>;
export type NormalizeBatchAiResponse = z.infer<typeof normalizeBatchAiResponseSchema>;
export type DuplicateClusterAiResponse = z.infer<typeof duplicateClusterAiResponseSchema>;
