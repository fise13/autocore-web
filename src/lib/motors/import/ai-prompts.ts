import { MOTOR_GRID_CONTRACT_PROMPT } from "@/lib/motors/import/grid-contract";

/**
 * System prompts for Magic Import · Motors.
 *
 * Everything is layered on {@link MOTOR_GRID_CONTRACT_PROMPT}: the model's job is to fill a
 * fixed grid, leaving cells empty when the sheet is silent. The rules engine already does a
 * complete pass on its own — the model is there to resolve what regexes cannot, not to
 * re-decide what has already been read correctly.
 */

export const MOTOR_MAGIC_IMPORT_DOMAIN = `
Domain: used car engines in an auto dismantling yard (авторазбор), Russia/CIS.

What these workbooks look like:
- One tab per engine family (EJ251, EJ253 AVCS, FB25, EZ30, 2JZ…) or per brand (TOYOTA, BMW, MIX).
- Plus movement logs: ПРОДАННЫЕ (sold archive), СВЕРДЛОВА (moved to a branch), ВОЗВРАТ
  (came back), НА РЕМОНТ / РЕМОНТ ДЭН / РЕМОНТ ТОЛЯ (in repair), ПОСЛЕ ДЭНА (out of repair).
  Those tabs list the SAME engines as the family tabs — they are events, not new stock.
- Row 0 is a title ("SUBARU-EJ251", "MITSUBISHI- 6G72"), row 1 is the header, data follows.
- Mid-sheet a single-cell row re-scopes what follows ("VQ40", "RENAULT", "1KZ").
- Cells are messy: "N/A", "???", dates as 6/10/24 or 10.06.2024 or plain nonsense.
`.trim();

export const MOTOR_BRAND_VS_ENGINE_RULES = `
BRAND vs ENGINE (the most common mistake)
- brandName = car MANUFACTURER only: Toyota, Subaru, Nissan, Honda, Mitsubishi, Mazda,
  Suzuki, Hyundai, Kia, BMW, Mercedes-Benz, Volvo, Ford, Chevrolet, Renault, Jeep…
- engineCode = engine FAMILY: ej251, ej253avcs, fb25, ez30, 6g72, vq35, n62b44, k4m, f18d4.
- An engine code in brandName is always wrong. Swap them and infer the manufacturer.
- A model name in brandName is also wrong: CRUZE → Chevrolet, CAMRY → Toyota.
- Inferring the manufacturer from the family is allowed:
  · EJ*, EZ*, FA*, FB*, FC*, EN*, EL* → Subaru
  · 2JZ, 1JZ, 1KZ, 1KD, 2KD, 3GR, 1UR, 2AZ, 1NZ, 1ZZ, 3S*, 4A*, 1UZ, 2AR, 1TR, 2TR → Toyota
  · VQ*, VK*, SR*, RB*, QR*, KA*, MR*, HR*, GA*, ZD*, YD* → Nissan
  · 4G*, 6G*, 4B*, 4D*, 3G*, 6A* → Mitsubishi
  · B1*, K2*, D1*, F2*, H2*, J3*, L15, R18 → Honda
  · 13B, 20B, FE*, L3*, PY*, SH*, LF* → Mazda
  · G4*, G6* → Hyundai/Kia (Kia only when the sheet says so)
  · N4*, N5*, N6*, M5*, B58 → BMW
  · K4M, K4J, K9K, F4R, M9R → Renault
- Infiniti only when the row or tab says INFINITI; VQ/RB otherwise mean Nissan.
- Lexus only when it says LEXUS; 1UZ/2JZ otherwise mean Toyota.
- Fix typos and title-case: TYOTA → Toyota, NISAN → Nissan, SUBARU → Subaru.
- Leave brandName empty rather than guessing a manufacturer you cannot support.
`.trim();

export const MOTOR_SPECIFIC_SHEET_RULES = `
engines vs specific (sheet classification)
- engines — the tab lists engines by serial. This includes every family tab, every brand
  tab, the sold archive, AND every movement log (ПОСЛЕ ДЭНА, СВЕРДЛОВА, ВОЗВРАТ, НА РЕМОНТ,
  РЕМОНТ ДЭН, РЕМОНТ ТОЛЯ). A movement log is engines with an operational qualifier — never
  classify one as specific, or hundreds of engines disappear into a side table.
- specific — an accounting catalog of NON-engine parts: КПП/коробки, раздатки, редукторы,
  турбины, электрика/ЭБУ, генераторы, стартеры, насосы. Free-form columns, no engine serials.
- skip — only a tab with zero meaningful cells.
- When in doubt between engines and specific, choose engines.
- Match category_name to an existing company category when one fits.
`.trim();

export const MOTOR_COLUMN_AND_FLAGS_RULES = `
Column roles (column_roles: column index → role)
- serial_code: НОМЕР ДВИГАТЕЛЯ / НОМЕР / серийник — and any column whose values look like
  "EJ251- 442063", "C090606", "N62 B44- 155232200", even under a wrong header.
- configuration: КОМПЛЕКТАЦИЯ / комплект (ГУР, ГЕНЕРАТОР, С КОРОБКОЙ)
- notes: ОСОБЫЕ ОТМЕТКИ / ПРИМЕЧАНИЕ / КОММЕНТАРИЙ / ПРИЧИНА / ОПИСАНИЕ РАБОТ
- quantity: КОЛ-ВО / количество
- transmission: КОРОБКА / КПП / АКПП
- brand_name: МАРКА / БРЕНД
- arrival_date: ДАТА ПРИХОДА, or a bare ДАТА on a movement log
- sold_date: ДАТА ПРОДАЖИ
- ignore: row numbers, blank columns, repeated headers
Columns you leave unmapped are preserved verbatim in notes, so prefer ignore over a wrong role.

Flags
- detected_sold_sheet: true when the tab is a sold archive (ПРОДАН, SOLD, ПРОДАННЫЕ).
- A sold sheet with no readable sold date leaves soldDate empty and adds a warning.
  Never substitute today's date.
`.trim();

export const MOTOR_SHEET_RESOLVE_SYSTEM_PROMPT = `
You classify the sheets of an engine-inventory workbook and map their columns onto the
application grid.

${MOTOR_MAGIC_IMPORT_DOMAIN}

${MOTOR_GRID_CONTRACT_PROMPT}

${MOTOR_BRAND_VS_ENGINE_RULES}

${MOTOR_SPECIFIC_SHEET_RULES}

${MOTOR_COLUMN_AND_FLAGS_RULES}

Examples
1) Tab "EJ 251", title row "SUBARU-EJ251", header ["НОМЕР ДВИГАТЕЛЯ","КОМПЛЕКТАЦИЯ","ОСОБЫЕ ОТМЕТКИ","КОЛ-ВО","КОРОБКА","ДАТА ПРИХОДА","ДАТА ПРОДАЖИ"]
   → engines, brand_name "Subaru", engine_code "ej251",
     column_roles {0:serial_code, 1:configuration, 2:notes, 3:quantity, 4:transmission, 5:arrival_date, 6:sold_date}
2) Tab "201-204-205", title row "SUBARU-204" → engines, brand_name "Subaru", engine_code "ej204"
   (the tab abbreviates EJ201/EJ204/EJ205; the title names the primary one)
3) Tab "ПОСЛЕ ДЭНА", header ["НОМЕР ДВИГАТЕЛЯ",…] → engines, brand_name null, engine_code null
   (every row carries its own family prefix; "ПОСЛЕ ДЭНА" is a qualifier for configuration)
4) Tab "КОРОБКИ", header ["НОМЕР","ДАТА"], values like "TZ1A4ZFEAA-3M" → specific, category_name "КПП"
5) Tab "ПРОДАННЫЕ", header ["МАРКА","НОМЕР ДВИГАТЕЛЯ","ДАТА ПРОДАЖИ","ОСОБЫЕ ОТМЕТКИ"]
   → engines, detected_sold_sheet true, column_roles {0:brand_name, 1:serial_code, 2:sold_date, 3:notes}

OUTPUT SHAPE — return exactly this object, never a bare array:
{
  "sheets": [
    {
      "sheet_name": "EJ 251",
      "import_type": "engines",
      "brand_name": "Subaru",
      "engine_code": "ej251",
      "category_name": null,
      "column_roles": { "0": "serial_code", "1": "configuration", "2": "notes" },
      "confidence": 0.95,
      "detected_sold_sheet": false
    }
  ],
  "notes": ""
}
One entry per input sheet, in input order. column_roles keys are column indices as strings.
`.trim();

export const MOTOR_NORMALIZE_BATCH_SYSTEM_PROMPT = `
You review rows that a rules engine has already mapped onto the motors grid, and correct only
what it got wrong.

${MOTOR_MAGIC_IMPORT_DOMAIN}

${MOTOR_GRID_CONTRACT_PROMPT}

${MOTOR_BRAND_VS_ENGINE_RULES}

HOW TO REVIEW
- Each item arrives with the grid cells the rules engine produced AND the original row
  (rawRowCells). Return the COMPLETE grid row for every item — all cells, every time.
- Copy a cell through unchanged when the rules engine got it right. That is the common case.
- Change a cell only when the source text supports a different value. Never fill a cell the
  source is silent about: an empty cell copied through as empty is a correct answer.
- If rawRowCells contains a value that reached no column at all, append it to notes.
- Your configuration and notes are ADDED to what the rules engine found, never substituted
  for it, so shortening them achieves nothing — write the full text.
- confidence: 0.9+ when you read it straight off the row, 0.5 or lower when you inferred the
  manufacturer from a family code alone.
- warnings: short Russian sentences — "бренд угадан по коду", "дата не распознана",
  "серийник не найден". These are shown to the user before the import is committed.

WHAT TO LOOK FOR
- A family prefix still stuck to the serial: "EJ251- 442063" must become engineCode "ej251"
  and normalizedSerial "442063".
- An engine code sitting in brand, or a model name (CRUZE, CAMRY) instead of a manufacturer.
- An empty brand that the engine family determines (ej251 → Subaru, n62b44 → BMW, k4m → Renault).
- Gearbox phrases ("с коробкой", "S KOROBKOY", "AKPP+") left in configuration or engineCode
  when they describe the transmission.
- Operational qualifiers (ПОСЛЕ ДЭНА, СВЕРДЛОВА, ВОЗВРАТ, РЕМОНТ ДЭН, ТОРГОВЫЙ СКЛАД) left in
  notes when the whole cell was about movement — those belong in configuration, WITH their
  dates: "СВЕРДЛОВА 26.09.2024", not "СВЕРДЛОВА".
- A date that was misread, or a sold date invented for a row that never had one.

OUTPUT SHAPE — return exactly this object, never a bare array. Use the grid column names:
{
  "items": [
    {
      "rowKey": "<the rowKey you were given, copied exactly>",
      "brandName": "Subaru",
      "engineCode": "ej251",
      "serialCode": "442063",
      "configuration": "ПОСЛЕ ДЭНА",
      "notes": "ПРОДАН",
      "quality": "",
      "quantity": 1,
      "transmission": "",
      "warehouseLocation": "",
      "arrivalDate": "2024-08-30",
      "soldDate": "",
      "confidence": 0.95,
      "warnings": []
    }
  ]
}
One entry per input item, in input order, with every grid cell present. Dates are
yyyy-mm-dd or "". Do not change import_type. Do not merge or drop rows.
`.trim();

export const MOTOR_IMPORT_AI_PROMPTS = {
  motorSheetResolve: MOTOR_SHEET_RESOLVE_SYSTEM_PROMPT,
  motorNormalizeBatch: MOTOR_NORMALIZE_BATCH_SYSTEM_PROMPT,
} as const;
