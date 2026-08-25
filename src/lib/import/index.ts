/**
 * AutoCore Business Import Engine — public surface.
 *
 * Framework-agnostic core that turns any parsed spreadsheet into a fully
 * classified, confidence-scored import preview. Domain Dictionary first, AI
 * fallback last. Safe to use in the browser, a Web Worker, on the server, and
 * in future mobile/AI contexts.
 */

export * from "./types";
export { analyzeTable, type AnalyzeOptions } from "./analyze";
export { detectColumns } from "./column-detector";
export { classifyRecord, type ClassifyOptions } from "./record-classifier";
export { applyAiFallback, type ApplyAiOptions } from "./ai-fallback";

/**
 * The reasoning half: discovery, entity resolution, relationships and the
 * plan that stands between any of it and the database.
 */
export * from "./business/contracts";
export { discoverSheet, discoverTables } from "./business/discovery";
export {
  entityKeysFor,
  findMergeCandidates,
  resolveEntities,
  type MergeCandidate,
  type ResolutionResult,
} from "./business/entity-resolution";
export {
  actionFingerprint,
  buildImportPlan,
  committableActions,
  FINANCIAL_REVIEW_THRESHOLD,
  type ExistingIndex,
} from "./business/import-plan";
export {
  NULL_BUSINESS_IMPORT_AI,
  type BusinessImportAI,
} from "./business/ai-port";
export { runBusinessImport, type ImportRunResult, type RunImportOptions } from "./business/pipeline";
export {
  FIELD_SIGNATURES,
  FIELD_SIGNATURE_BY_FIELD,
  matchHeaderToFields,
  type FieldSignature,
  type HeaderMatch,
} from "./canonical-fields";
export {
  CONFIDENCE_THRESHOLDS,
  combineConfidence,
  confidencePercent,
  fromDictionaryScore,
  makeConfidence,
  tierColorToken,
  tierForScore,
} from "./confidence";
export { ingestFiles, imageMatchKey, type IngestInput } from "./ingestion/ingest";
export { parseWorkbook, parseDelimitedText } from "./ingestion/parse-tables";
export { extractArchive } from "./ingestion/extract-archive";
export {
  extensionOf,
  IMAGE_EXTENSIONS,
  SPREADSHEET_EXTENSIONS,
  TEXT_TABLE_EXTENSIONS,
  type ImageAsset,
  type IngestResult,
  type SourceFile,
} from "./ingestion/types";
export { matchPhotos, type PhotoMatch, type PhotoMatchBy } from "./photo-matching";
export {
  explainRow,
  suggestRecordTypes,
  type RowExplanation,
  type RowReason,
  type ReasonTone,
  type RecordSuggestion,
} from "./insights";
export {
  detectCurrency,
  isVin,
  looksLikeCode,
  looksLikeCondition,
  looksLikeMileage,
  looksLikePhoto,
  looksLikePrice,
  looksLikeQuantity,
  parseNumericValue,
  parseYear,
} from "./value-detectors";
