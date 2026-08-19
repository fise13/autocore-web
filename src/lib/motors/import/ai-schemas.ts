import { z } from "zod";

export const aiMotorColumnRoleSchema = z.enum([
  "serial_code",
  "configuration",
  "notes",
  "quantity",
  "transmission",
  // Sold archives carry the manufacturer per row in a МАРКА column, and some workbooks
  // split the engine family into its own column.
  "brand_name",
  "engine_code",
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

/**
 * Models sometimes answer with the bare list instead of the documented envelope. The prompt
 * spells the envelope out; this accepts the list anyway rather than throwing away a good
 * answer over its wrapper.
 */
function unwrapList(key: string) {
  return (value: unknown) => {
    if (Array.isArray(value)) return { [key]: value };
    return value;
  };
}

export const motorSheetResolveResponseSchema = z.preprocess(
  unwrapList("sheets"),
  z.object({
    sheets: z.array(motorSheetResolveItemSchema),
    notes: z.string().optional().default(""),
  }),
);

/**
 * One grid row as the model returns it.
 *
 * Field names are the grid's own — `brandName`, `serialCode` — the same vocabulary the
 * contract prompt uses. They used to be `brand` and `normalizedSerial`, which meant a model
 * answering in the documented vocabulary had its corrections silently dropped. The older
 * names are still accepted so nothing that was already in flight breaks.
 */
const withLegacyFieldNames = (value: unknown) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const item = value as Record<string, unknown>;
  return {
    ...item,
    brandName: item.brandName ?? item.brand,
    serialCode: item.serialCode ?? item.normalizedSerial,
  };
};

export const motorNormalizeBatchItemSchema = z.preprocess(
  withLegacyFieldNames,
  z.object({
    rowKey: z.string(),
    brandName: z.string().optional(),
    engineCode: z.string().optional(),
    serialCode: z.string().optional(),
    configuration: z.string().optional(),
    notes: z.string().optional(),
    quality: z.string().optional(),
    quantity: z.number().int().positive().optional(),
    transmission: z.string().optional(),
    warehouseLocation: z.string().optional(),
    arrivalDate: z.string().optional(),
    soldDate: z.string().optional(),
    confidence: z.number().min(0).max(1),
    warnings: z.array(z.string()).default([]),
  }),
);

export const motorNormalizeBatchResponseSchema = z.preprocess(
  unwrapList("items"),
  z.object({
    items: z.array(motorNormalizeBatchItemSchema),
  }),
);

export type MotorSheetResolveItem = z.infer<typeof motorSheetResolveItemSchema>;
export type MotorSheetResolveResponse = z.infer<typeof motorSheetResolveResponseSchema>;
export type MotorNormalizeBatchItem = z.infer<typeof motorNormalizeBatchItemSchema>;
export type MotorNormalizeBatchResponse = z.infer<typeof motorNormalizeBatchResponseSchema>;
