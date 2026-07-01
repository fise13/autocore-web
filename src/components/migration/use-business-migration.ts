"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import {
  analyzeTable,
  explainRow,
  ingestFiles,
  makeConfidence,
  matchPhotos,
  RECORD_TYPE_LABELS,
  RECORD_TYPE_TARGET,
  suggestRecordTypes,
  type CanonicalField,
  type ClassifiedRow,
  type ImageAsset,
  type ImportAnalysis,
  type RecordSuggestion,
  type RecordType,
} from "@/lib/import";
import type { DomainCategory } from "@/lib/domain/types";
import type { DomainDictionary } from "@/lib/domain/domain-dictionary";

import { FIELD_SIGNATURE_BY_FIELD } from "@/lib/import";
import type {
  DuplicateGroup,
  MigrationCommitPort,
  MigrationLearnFn,
  MigrationPhase,
  MigrationProgress,
  MigrationResult,
  RecognitionSummary,
  ReviewRow,
  ReviewTableMapping,
} from "./migration-types";

export type UseBusinessMigrationOptions = {
  commitPort: MigrationCommitPort;
  companyId?: string;
  getCompanyDictionary?: (category: DomainCategory) => DomainDictionary | null;
  existingKeys?: {
    serials?: Set<string>;
    skus?: Set<string>;
    vins?: Set<string>;
    names?: Set<string>;
  };
  onLearn?: MigrationLearnFn;
};

const DUP_FIELDS: CanonicalField[] = ["serial", "vin", "sku", "name"];

function buildReviewRow(
  tableIndex: number,
  tableName: string,
  row: ClassifiedRow,
  photo: ImageAsset | undefined,
  getCompanyDictionary?: UseBusinessMigrationOptions["getCompanyDictionary"],
): ReviewRow {
  const needsHelp = row.confidence.tier !== "high" || row.classification.recordType === "unknown";
  return {
    id: `${tableIndex}:${row.index}`,
    source: tableName,
    values: { ...row.values },
    recordType: row.classification.recordType,
    target: row.classification.target,
    confidence: row.confidence,
    explanation: explainRow(row),
    suggestions: needsHelp ? suggestRecordTypes(row, { getCompanyDictionary }) : [],
    issues: row.issues,
    photo,
    status: "pending",
    edited: false,
  };
}

function buildMapping(tableIndex: number, analysis: ImportAnalysis): ReviewTableMapping {
  const fields = analysis.mapping.columns
    .filter((column) => column.field)
    .map((column) => ({
      field: column.field as CanonicalField,
      header: column.header,
      confidence: column.confidence,
    }));
  const unmappedHeaders = analysis.mapping.columns
    .filter((column) => !column.field)
    .map((column) => column.header);
  return {
    id: `${tableIndex}:${analysis.table.name}`,
    name: analysis.table.name,
    fields,
    unmappedHeaders,
  };
}

function buildRecognition(rows: ReviewRow[], images: ImageAsset[], tableCount: number): RecognitionSummary {
  const counts = new Map<RecordType, number>();
  for (const row of rows) {
    counts.set(row.recordType, (counts.get(row.recordType) ?? 0) + 1);
  }
  const byType = [...counts.entries()]
    .filter(([type]) => type !== "unknown")
    .map(([type, count]) => ({ type, label: RECORD_TYPE_LABELS[type], count }))
    .sort((a, b) => b.count - a.count);

  const matchedPhotos = rows.filter((row) => row.photo).length;
  const recognized = rows.filter((row) => row.confidence.tier === "high").length;
  const needsReview = rows.length - recognized;
  const unknown = counts.get("unknown") ?? 0;

  const duplicates = countDuplicates(rows);
  const etaSeconds = Math.max(
    4,
    Math.round(rows.length / 180 + images.length / 40 + tableCount),
  );

  return {
    totalRows: rows.length,
    recognized,
    needsReview,
    unknown,
    byType,
    photos: images.length,
    unmatchedPhotos: Math.max(0, images.length - matchedPhotos),
    duplicates,
    etaSeconds,
    tableCount,
  };
}

function dedupeKey(value: string): string {
  return value.trim().toLowerCase();
}

function buildDuplicateGroups(rows: ReviewRow[]): DuplicateGroup[] {
  const groups: DuplicateGroup[] = [];
  for (const field of DUP_FIELDS) {
    const byValue = new Map<string, string[]>();
    for (const row of rows) {
      const raw = row.values[field];
      if (!raw) continue;
      const key = dedupeKey(raw);
      if (!key) continue;
      const list = byValue.get(key) ?? [];
      list.push(row.id);
      byValue.set(key, list);
    }
    for (const [, rowIds] of byValue) {
      if (rowIds.length > 1) {
        groups.push({ field, value: rows.find((r) => r.id === rowIds[0])!.values[field] ?? "", rowIds, resolution: "update" });
      }
    }
    if (groups.length > 0) break; // strongest dup signal only (serial > vin > sku > name)
  }
  return groups;
}

function countDuplicates(rows: ReviewRow[]): number {
  return buildDuplicateGroups(rows).reduce((sum, group) => sum + (group.rowIds.length - 1), 0);
}

export function useBusinessMigration(options: UseBusinessMigrationOptions) {
  const { commitPort, companyId, getCompanyDictionary, existingKeys, onLearn } = options;

  const [phase, setPhase] = useState<MigrationPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [mappings, setMappings] = useState<ReviewTableMapping[]>([]);
  const [images, setImages] = useState<ImageAsset[]>([]);
  const [recognition, setRecognition] = useState<RecognitionSummary | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState<MigrationProgress | null>(null);
  const [result, setResult] = useState<MigrationResult | null>(null);

  const cancelRef = useRef(false);

  const acceptFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      setPhase("analyzing");
      setError(null);
      setFileNames(files.map((file) => file.name));

      try {
        const ingestion = await ingestFiles(
          files.map((file) => ({ name: file.name, arrayBuffer: () => file.arrayBuffer() })),
        );

        if (ingestion.tables.length === 0) {
          setError(
            ingestion.warnings[0] ??
              "В файле не найдено таблиц. Поддерживаются Excel, CSV и ZIP с этими файлами.",
          );
          setPhase("error");
          return;
        }

        const reviewRows: ReviewRow[] = [];
        const tableMappings: ReviewTableMapping[] = [];
        ingestion.tables.forEach((table, tableIndex) => {
          const analysis = analyzeTable(table, { existingKeys, getCompanyDictionary });
          tableMappings.push(buildMapping(tableIndex, analysis));
          const photoByRow = new Map<number, ImageAsset>();
          for (const match of matchPhotos(analysis.rows, ingestion.images)) {
            if (match.images[0]) photoByRow.set(match.rowIndex, match.images[0]);
          }
          for (const row of analysis.rows) {
            reviewRows.push(
              buildReviewRow(tableIndex, table.name, row, photoByRow.get(row.index), getCompanyDictionary),
            );
          }
        });

        setRows(reviewRows);
        setMappings(tableMappings);
        setImages(ingestion.images);
        setDuplicates(buildDuplicateGroups(reviewRows));
        setRecognition(buildRecognition(reviewRows, ingestion.images, ingestion.tables.length));
        setPhase("recognition");
      } catch (error) {
      const raw = error instanceof Error ? error.message : "";
      const message = raw.includes("Missing or insufficient permissions")
        ? "Недостаточно прав для сохранения. Обновите страницу и попробуйте снова."
        : raw.trim() || "Не удалось разобрать файл. Попробуйте другой файл или обратитесь в поддержку.";
      setError(message);
      setPhase("error");
    }
    },
    [existingKeys, getCompanyDictionary],
  );

  const continueToReview = useCallback(() => setPhase("review"), []);

  const updateRow = useCallback((id: string, updater: (row: ReviewRow) => ReviewRow) => {
    setRows((current) => current.map((row) => (row.id === id ? updater(row) : row)));
  }, []);

  const setRowType = useCallback(
    (id: string, type: RecordType) => {
      updateRow(id, (row) => ({
        ...row,
        recordType: type,
        target: RECORD_TYPE_TARGET[type],
        confidence: makeConfidence(1, "Выбрано вручную", "manual"),
        explanation: {
          percent: 100,
          tier: "high",
          reasons: [{ tone: "positive", label: `Тип выбран вручную: ${RECORD_TYPE_LABELS[type]}` }],
        },
        suggestions: [],
        issues: row.issues.filter((issue) => issue.kind !== "unknown-type"),
        edited: true,
      }));
      const row = rows.find((item) => item.id === id);
      if (row?.values.name) void onLearn?.({ recordType: type, value: row.values.name });
    },
    [onLearn, rows, updateRow],
  );

  const applySuggestion = useCallback(
    (id: string, suggestion: RecordSuggestion) => {
      updateRow(id, (row) => ({
        ...row,
        recordType: suggestion.recordType,
        target: suggestion.target,
        confidence: makeConfidence(
          Math.max(suggestion.confidence, 0.9),
          `Применено предложение: ${suggestion.label}`,
          "manual",
        ),
        explanation: {
          percent: Math.round(Math.max(suggestion.confidence, 0.9) * 100),
          tier: "high",
          reasons: [{ tone: "positive", label: `Применено предложение: ${suggestion.label}` }],
        },
        suggestions: [],
        issues: row.issues.filter((issue) => issue.kind !== "unknown-type"),
        edited: true,
      }));
      const row = rows.find((item) => item.id === id);
      if (row?.values.name) void onLearn?.({ recordType: suggestion.recordType, value: row.values.name });
    },
    [onLearn, rows, updateRow],
  );

  const setRowValue = useCallback(
    (id: string, field: CanonicalField, value: string) => {
      updateRow(id, (row) => ({
        ...row,
        values: { ...row.values, [field]: value },
        edited: true,
      }));
    },
    [updateRow],
  );

  const attachPhoto = useCallback(
    (id: string, photo: ImageAsset) => {
      updateRow(id, (row) => ({ ...row, photo, edited: true }));
    },
    [updateRow],
  );

  const skipRows = useCallback((ids: string[]) => {
    const set = new Set(ids);
    setRows((current) =>
      current.map((row) => (set.has(row.id) ? { ...row, status: "skipped" as const } : row)),
    );
  }, []);

  const restoreRows = useCallback((ids: string[]) => {
    const set = new Set(ids);
    setRows((current) =>
      current.map((row) => (set.has(row.id) ? { ...row, status: "pending" as const } : row)),
    );
  }, []);

  const deleteRows = useCallback((ids: string[]) => {
    const set = new Set(ids);
    setRows((current) => current.filter((row) => !set.has(row.id)));
    setSelection((current) => {
      const next = new Set(current);
      for (const id of ids) next.delete(id);
      return next;
    });
  }, []);

  const acceptAllSuggestions = useCallback(() => {
    setRows((current) =>
      current.map((row) => {
        const top = row.suggestions[0];
        if (!top) return row;
        return {
          ...row,
          recordType: top.recordType,
          target: top.target,
          confidence: makeConfidence(Math.max(top.confidence, 0.9), `Применено предложение: ${top.label}`, "manual"),
          explanation: {
            percent: Math.round(Math.max(top.confidence, 0.9) * 100),
            tier: "high" as const,
            reasons: [{ tone: "positive" as const, label: `Применено предложение: ${top.label}` }],
          },
          suggestions: [],
          issues: row.issues.filter((issue) => issue.kind !== "unknown-type"),
          edited: true,
        };
      }),
    );
  }, []);

  const setDuplicateResolution = useCallback(
    (index: number, resolution: DuplicateGroup["resolution"]) => {
      setDuplicates((current) =>
        current.map((group, groupIndex) => (groupIndex === index ? { ...group, resolution } : group)),
      );
    },
    [],
  );

  const toggleSelect = useCallback((id: string) => {
    setSelection((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback((ids: string[]) => setSelection(new Set(ids)), []);
  const clearSelection = useCallback(() => setSelection(new Set()), []);

  const startMigration = useCallback(async () => {
    cancelRef.current = false;
    setPhase("migrating");
    try {
      const migrationResult = await commitPort.commit(
        { companyId, rows, duplicates },
        setProgress,
        () => cancelRef.current,
      );
      setResult(migrationResult);
      setPhase("completed");
    } catch (error) {
      const raw = error instanceof Error ? error.message : "";
      const message = raw.includes("Missing or insufficient permissions")
        ? "Недостаточно прав для сохранения. Обновите страницу и попробуйте снова."
        : raw.trim() || "Миграция прервана. Данные не были изменены. Попробуйте ещё раз.";
      setError(message);
      setPhase("error");
    }
  }, [commitPort, companyId, duplicates, rows]);

  const cancelMigration = useCallback(() => {
    cancelRef.current = true;
  }, []);

  const reset = useCallback(() => {
    setPhase("idle");
    setError(null);
    setFileNames([]);
    setRows([]);
    setMappings([]);
    setImages([]);
    setRecognition(null);
    setDuplicates([]);
    setSelection(new Set());
    setProgress(null);
    setResult(null);
    cancelRef.current = false;
  }, []);

  const undo = useCallback(async () => {
    if (!result?.undoToken || !commitPort.undo) return;
    await commitPort.undo(result.undoToken);
    setResult(null);
    reset();
  }, [commitPort, result, reset]);

  const fieldLabel = useCallback((field: CanonicalField) => FIELD_SIGNATURE_BY_FIELD[field]?.label ?? field, []);

  const pendingCount = useMemo(() => rows.filter((row) => row.status === "pending").length, [rows]);

  return {
    phase,
    error,
    fileNames,
    rows,
    mappings,
    images,
    recognition,
    duplicates,
    selection,
    progress,
    result,
    pendingCount,
    canUndo: commitPort.canUndo,
    acceptFiles,
    continueToReview,
    setRowType,
    applySuggestion,
    setRowValue,
    attachPhoto,
    skipRows,
    restoreRows,
    deleteRows,
    acceptAllSuggestions,
    setDuplicateResolution,
    toggleSelect,
    selectAll,
    clearSelection,
    startMigration,
    cancelMigration,
    undo,
    reset,
    fieldLabel,
  };
}

export type BusinessMigrationController = ReturnType<typeof useBusinessMigration>;
