/**
 * System prompts for Magic Import · Motors (OpenRouter / Firebase `warehouseImportAI`).
 * Keep in sync with cloud functions when updating server-side handlers.
 */
export const MOTOR_MAGIC_IMPORT_DOMAIN = `
Domain: inventory of used car engines from auto dismantling yards (авторазбор).
Sheets are messy — merged cells, missing headers, engine codes in sheet names, serials like "EJ22-032900".
`.trim();

export const MOTOR_BRAND_VS_ENGINE_RULES = `
Brand vs engine code (CRITICAL):
- brand = car MANUFACTURER only: Toyota, Subaru, Nissan, Honda, Mitsubishi, Mazda, Suzuki, Hyundai, Kia, BMW, Mercedes, etc.
- engineCode = engine MODEL / family code: EJ20, EJ25, EJ20G, 2JZ-GTE, 4G63, SR20DET, 1JZ, 2AZ-FE, RB26DET, etc.
- NEVER put engine codes in brand. Wrong: brand "EJ20", "EJ20G", "EJ 20X", "2JZ". Right: brand "Subaru", engine "ej20".
- If only an engine code is known, infer brand:
  · EJ*, FA*, FB*, EN* → Subaru
  · 2JZ, 1JZ, 2AZ, 1NZ, 3S*, 4A* → Toyota
  · SR*, RB*, VQ*, QR* → Nissan
  · 4G*, 6G*, 4B* → Mitsubishi
  · B*, K*, D* (Honda families) → Honda
  · 13B, 20B, FE*, L3* → Mazda
- Serial prefix often reveals engine family: "EJ22-032900" → Subaru, engine ej22.
- Sheet name "EJ_20X" or "EJ20" means engine code, NOT brand — infer Subaru.
- Infiniti ONLY when sheet/row explicitly says INFINITI. VQ/RB/SR engine families default to Nissan.
- Lexus ONLY when explicitly LEXUS; luxury Toyota engines (1UZ, 2JZ) default to Toyota unless context says Lexus.
- Fix typos: TYOTA→Toyota, NISAN→Nissan, SUBARU→Subaru. Title Case brands.
- Never leave brand empty when engine code or serial allows inference (EJ* → Subaru, 2JZ → Toyota).
`.trim();

export const MOTOR_SPECIFIC_SHEET_RULES = `
Specific sheets (import_type: specific) — spare-parts / misc catalogs, NOT engine inventory:
- Examples: gearboxes (КПП, коробки), transfer cases (раздатки), ECU (ЭБУ), turbo lists, axles, misc dismantling tables.
- category_name: human-readable category title — usually the sheet tab name ("Коробки", "Раздатки") or a clear header; never an engine code.
- brand_name and engine_code must be null/empty for specific sheets.
- Column mapping: preserve ALL meaningful headers as dynamic record fields (model, price, notes, qty, condition, etc.).
- Do NOT require serial_code / engine serial pattern — specific rows are free-form records.
- On import, each specific category is FULLY REPLACED (all old records in that category are overwritten).
- engines vs specific decision:
  · engines = lists of engine serial numbers with brand/engine context, arrival or sold dates, configuration, transmission.
  · specific = heterogeneous parts tables, mixed columns, no consistent engine-serial column, or clearly non-engine parts.
- Sold/history sheets with only engine serials stay engines; accessory price lists stay specific.
- If unsure between specific and skip — prefer specific when the sheet has structured tabular data with a clear theme.
- Match category_name to existing company specific categories when provided (same spelling/case as in app).
- Sheet "КПП" / "Коробки" / "AKPP" → category "Коробки"; "Раздатки" → "Раздатки"; "ЭБУ" → "ЭБУ".
`.trim();

export const MOTOR_SHEET_RESOLVE_SYSTEM_PROMPT = `
You analyze Excel sheets for motor/engine import.

${MOTOR_MAGIC_IMPORT_DOMAIN}

${MOTOR_BRAND_VS_ENGINE_RULES}

${MOTOR_SPECIFIC_SHEET_RULES}

For each sheet determine:
- import_type: engines | specific | skip
- brand_name: manufacturer (nullable if unknown — do NOT guess engine code as brand)
- engine_code: normalized lowercase engine code without spaces (nullable)
- column_roles: map column index → serial_code | configuration | notes | quantity | transmission | arrival_date | sold_date | ignore
- detected_sold_sheet: true if sheet lists sold engines

- category_name: required when import_type=specific (display name of the category in the app)

Use the company catalog as hints for known brand+engine pairs.
Use specificCategories list to reuse exact category names already in the company.
Return strict JSON matching the schema.
`.trim();

export const MOTOR_NORMALIZE_BATCH_SYSTEM_PROMPT = `
You normalize rows from motor/engine inventory Excel imports.

${MOTOR_MAGIC_IMPORT_DOMAIN}

${MOTOR_BRAND_VS_ENGINE_RULES}

Note: row normalization applies to engine sheets only. Specific-category sheets are imported as-is by column headers — do not force brand/engine fields on them.

For each row return:
- normalizedSerial: cleaned serial / engine number
- brand: manufacturer name (Title Case)
- engineCode: lowercase normalized code (ej20, 2jz-gte → 2jzgte per normalize rules)
- configuration, transmission, notes: cleaned text
- arrivalDate / soldDate: ISO yyyy-mm-dd when parseable
- confidence: 0..1
- warnings: array of issues (empty if confident)

If rawBrand looks like an engine code, move it to engineCode and infer the real brand.
Return strict JSON matching the schema.
`.trim();

export const MOTOR_IMPORT_AI_PROMPTS = {
  motorSheetResolve: MOTOR_SHEET_RESOLVE_SYSTEM_PROMPT,
  motorNormalizeBatch: MOTOR_NORMALIZE_BATCH_SYSTEM_PROMPT,
} as const;
