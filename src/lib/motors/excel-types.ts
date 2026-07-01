export type ExcelSheetData = {
  name: string;
  rows: string[][];
};

export type ParsedImportMotorRow = {
  sheetName: string;
  serialCode: string;
  configuration: string;
  notes: string;
  quantity: number;
  transmission: string;
  arrivalDate: Date | null;
  soldDate: Date | null;
  brandName: string;
  engineCode: string;
  /** Non-empty cell values from the source Excel row (for Magic Import AI context). */
  rawRowCells?: string;
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
