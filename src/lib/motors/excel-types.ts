export type ExcelSheetData = {
  name: string;
  rows: string[][];
};

export type ParsedImportMotorRow = {
  sheetName: string;
  serialCode: string;
  configuration: string;
  notes: string;
  /** Free-text grade / condition — empty unless the source states one. */
  quality: string;
  quantity: number;
  transmission: string;
  /** Free-text shelf or warehouse — empty unless the source states one. */
  warehouseLocation: string;
  arrivalDate: Date | null;
  soldDate: Date | null;
  brandName: string;
  engineCode: string;
  /** Non-empty cell values from the source Excel row (for Magic Import AI context). */
  rawRowCells?: string;
  /** Zero-based index of the row in the source sheet — stable key for merge and review. */
  sourceRowIndex?: number;
  /** What the parser could not resolve in this row; surfaced in preview warnings. */
  rowWarnings?: string[];
};

export type MotorExcelImportResult = {
  imported: number;
  updated: number;
  skipped: number;
  sheetsProcessed: number;
  specificRecordsImported: number;
  specificCategoriesUpdated: number;
  errors: string[];
};

export type MotorExcelExportOptions = {
  dateFormat: "dd.MM.yyyy" | "yyyy-MM-dd";
  includeSold: boolean;
  separateByEngine: boolean;
};
