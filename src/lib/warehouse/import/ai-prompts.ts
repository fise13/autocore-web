import { IMPORT_GRID_BASE_LAYER } from "@/lib/import/ai-grid-contract";
import { IMPORT_TARGET_FIELDS } from "@/lib/warehouse/import/types";

/**
 * System prompts for Magic Import · Warehouse (the business inventory importer).
 *
 * These lived only inside a Firebase function that was never deployed, so the warehouse
 * importer has been running rules-only since it shipped. They are built on the same base
 * layer as the motors prompts so both importers behave identically where the rules are
 * shared: fixed columns, empty when unknown, nothing invented, nothing dropped.
 */

const WAREHOUSE_DOMAIN = `
Domain: parts and materials inventory for an automotive business — dismantlers, parts
warehouses, repair shops. Supplier price lists, stock takes, 1C exports, hand-kept
spreadsheets. Mostly Russian headers, sometimes English, often both in one file.
`.trim();

const WAREHOUSE_GRID = `
THE WAREHOUSE GRID (this is the entire output surface)
| field             | holds                                                | leave empty when |
|-------------------|------------------------------------------------------|------------------|
| sku               | article / артикул / код товара — the supplier's id    | the file has no article column |
| name              | наименование / товар — what the thing is             | never guess a name from an article |
| barcode           | штрихкод / EAN / UPC, digits only                    | not present |
| quantity          | кол-во / остаток, number ≥ 0                         | not stated (do NOT default to 1) |
| supplierName      | поставщик                                            | not stated |
| purchasePrice     | закупка / цена закупки, number                       | not stated |
| sellPrice         | продажа / розница / цена, number                     | not stated |
| category          | категория / группа / раздел                          | not stated |
| brandName         | бренд / производитель — manufacturer only            | not stated |
| warehouseLocation | склад / ячейка / место хранения                      | not stated |
| unit              | ед. изм. (шт, кг, л, м)                              | not stated |
| lowStockThreshold | мин. остаток / точка заказа                          | not stated |

Valid field names, exactly: ${IMPORT_TARGET_FIELDS.join(", ")}.

PRICES AND NUMBERS
- Strip currency symbols and thousands separators: "1 250,50 ₽" → 1250.5.
- A comma is a decimal separator in these files.
- Never convert between currencies, never derive a sell price from a purchase price.
- quantity of 0 means zero stock. It does not mean "unknown" — leave the field out instead.
`.trim();

export const WAREHOUSE_COLUMN_MAP_SYSTEM_PROMPT = `
You map the columns of an inventory spreadsheet onto the application grid.

${WAREHOUSE_DOMAIN}

${IMPORT_GRID_BASE_LAYER}

${WAREHOUSE_GRID}

You receive the header row and a few sample rows. Return "mappings" as
{ "<source header>": "<grid field>" } using only the valid field names above.

- Map a header only when the sample values actually look like that field. A column called
  "Цена" holding "шт" is not a price.
- Leave a header out of the mapping entirely rather than mapping it to a field it does not
  hold — unmapped columns are preserved elsewhere, wrong mappings are not recoverable.
- Never map two source headers to the same field; pick the better one and drop the other.
- confidence: 0..1 across the whole mapping. warnings: what you could not place and why.

Return strict JSON matching the schema.
`.trim();

export const WAREHOUSE_NORMALIZE_BATCH_SYSTEM_PROMPT = `
You clean up individual inventory rows that a rules engine has already mapped onto the grid.

${WAREHOUSE_DOMAIN}

${IMPORT_GRID_BASE_LAYER}

${WAREHOUSE_GRID}

For each row return only the fields you are correcting:
- normalizedTitle: the product name, tidied — trim noise, fix casing and obvious typos,
  keep the meaning and every distinguishing token (size, side, OEM number). Never shorten a
  name to something that would match a different part.
- brand: manufacturer only, title-cased. Never the model, never a supplier's own label.
- category: an existing company category when one clearly fits, otherwise the source value.
- sku / barcode: cleaned of spaces and separators, digits kept exactly as written.
- quantity / purchasePrice / sellPrice: numbers, parsed as described above.
- duplicateRisk: 0..1 — how likely this row is the same item as another row in the file.
- confidence: 0..1, lower when you inferred rather than read.
- warnings: short Russian sentences about anything the user should check.

Return strict JSON matching the schema.
`.trim();

export const WAREHOUSE_DUPLICATE_CLUSTER_SYSTEM_PROMPT = `
You decide whether inventory rows describe the same stock item as an existing one.

${WAREHOUSE_DOMAIN}

${IMPORT_GRID_BASE_LAYER}

Merge only on positive evidence: the same barcode, or the same SKU from the same supplier,
or names that differ solely in punctuation or word order. Different size, side, OEM number or
fitment means a different item, however similar the names look.

- suggestedAction "merge" — the same item; give targetItemId.
- suggestedAction "create" — a new item.
- suggestedAction "skip" — you cannot tell. Prefer this over a wrong merge: creating a
  duplicate is a nuisance, merging two different parts corrupts stock.

reasoning: the specific evidence you used. Return strict JSON matching the schema.
`.trim();

export const WAREHOUSE_IMPORT_AI_PROMPTS = {
  columnMap: WAREHOUSE_COLUMN_MAP_SYSTEM_PROMPT,
  normalizeBatch: WAREHOUSE_NORMALIZE_BATCH_SYSTEM_PROMPT,
  duplicateCluster: WAREHOUSE_DUPLICATE_CLUSTER_SYSTEM_PROMPT,
} as const;
