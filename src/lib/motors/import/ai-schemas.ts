import { z } from "zod";

export const aiMotorColumnRoleSchema = z.enum([
  "serial_code",
  "configuration",
  "notes",
  "quantity",
  "transmission",
  "arrival_date",
  "sold_date",
  "ignore",
]);

export const motorSheetResolveItemSchema = z.object({
  sheet_name: z.string(),
  import_type: z.enum(["engines", "specific", "skip"]),
  brand_name: z.string().nullable().optional(),
  engine_code: z.string().nullable().optional(),
  category_name: z.string().nullable().optional(),
  column_roles: z.record(z.string(), aiMotorColumnRoleSchema).default({}),
  confidence: z.number().min(0).max(1),
  detected_sold_sheet: z.boolean().default(false),
  fallback_date_columns: z.array(z.number()).default([]),
});

export const motorSheetResolveResponseSchema = z.object({
  sheets: z.array(motorSheetResolveItemSchema),
  notes: z.string().optional().default(""),
});

export const motorNormalizeBatchItemSchema = z.object({
  rowKey: z.string(),
  normalizedSerial: z.string().optional(),
  brand: z.string().optional(),
  engineCode: z.string().optional(),
  confidence: z.number().min(0).max(1),
  warnings: z.array(z.string()).default([]),
});

export const motorNormalizeBatchResponseSchema = z.object({
  items: z.array(motorNormalizeBatchItemSchema),
});

export type MotorSheetResolveItem = z.infer<typeof motorSheetResolveItemSchema>;
export type MotorSheetResolveResponse = z.infer<typeof motorSheetResolveResponseSchema>;
export type MotorNormalizeBatchItem = z.infer<typeof motorNormalizeBatchItemSchema>;
export type MotorNormalizeBatchResponse = z.infer<typeof motorNormalizeBatchResponseSchema>;
