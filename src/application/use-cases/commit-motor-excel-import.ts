import { createMotorUseCase } from "@/application/use-cases/create-motor";
import { upsertMotorUseCase } from "@/application/use-cases/upsert-motor";
import { MotorEntity } from "@/domain/motor";
import { buildEngineRowsFromSheet, buildSpecificRowsFromSheet } from "@/lib/motors/excel-import-engine-rows";
import { SheetColumnMapping } from "@/lib/motors/excel-column-mapping";
import { effectiveBrand, effectiveEngineCode, SheetImportConfig } from "@/lib/motors/excel-sheet-config";
import { ExcelSheetData, MotorExcelImportResult, ParsedImportMotorRow } from "@/lib/motors/excel-types";
import { MotorImportPreviewRow } from "@/lib/motors/import/types";
import {
  BrandEntity,
  CatalogRepository,
  EngineEntity,
} from "@/infrastructure/firestore/catalog-repository";
import { MotorRepository } from "@/infrastructure/firestore/motor-repository";
import {
  SpecificCategoryEntity,
  SpecificCategoryRepository,
} from "@/infrastructure/firestore/specific-category-repository";
import { createActivityLogRepository } from "@/infrastructure/firestore/activity-log-repository";

function normalizeSerial(value: string): string {
  return value.trim().toLowerCase();
}

export async function commitMotorExcelImport(params: {
  uid: string;
  companyId: string;
  repository: MotorRepository;
  catalogRepository: CatalogRepository;
  specificCategoryRepository: SpecificCategoryRepository;
  existingMotors: MotorEntity[];
  existingBrands: BrandEntity[];
  existingEngines: EngineEntity[];
  existingSpecificCategories: SpecificCategoryEntity[];
  sheets: ExcelSheetData[];
  sheetConfigs: SheetImportConfig[];
  columnMappings: Record<string, SheetColumnMapping>;
  selectedEngineRows?: MotorImportPreviewRow[];
  onProgress?: (progress: {
    applied: number;
    total: number;
    percent: number;
    createdMotorIds: string[];
    updatedMotorIds: string[];
    createdBrandIds: string[];
    createdEngineIds: string[];
  }) => void;
  shouldCancel?: () => boolean;
}): Promise<
  MotorExcelImportResult & {
    createdMotorIds: string[];
    updatedMotorIds: string[];
    createdBrandIds: string[];
    createdEngineIds: string[];
  }
> {
  const bySerial = new Map<string, MotorEntity>();
  for (const motor of params.existingMotors) {
    if (!motor.serialCode.trim()) continue;
    bySerial.set(normalizeSerial(motor.serialCode), motor);
  }

  let imported = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];
  const processedSheets = new Set<string>();
  let workingMotors = [...params.existingMotors];
  let workingBrands = [...params.existingBrands];
  let workingEngines = [...params.existingEngines];
  let workingSpecificCategories = [...params.existingSpecificCategories];
  let specificRecordsImported = 0;
  let specificCategoriesUpdated = 0;
  const createdMotorIds: string[] = [];
  const updatedMotorIds: string[] = [];
  const createdBrandIds: string[] = [];
  const createdEngineIds: string[] = [];

  const selectedKeys = new Set((params.selectedEngineRows ?? []).filter((row) => row.selected).map((row) => row.rowKey));
  const useSelection = selectedKeys.size > 0;
  const selectedTotal = useSelection ? selectedKeys.size : 0;
  let processedSelected = 0;

  function previewRowToParsed(row: MotorImportPreviewRow): ParsedImportMotorRow {
    return {
      sheetName: row.sheetName,
      serialCode: row.serialCode,
      configuration: row.configuration,
      notes: row.notes,
      quantity: row.quantity,
      transmission: row.transmission,
      arrivalDate: row.arrivalDate,
      soldDate: row.soldDate,
      brandName: row.brandName,
      engineCode: row.engineCode,
    };
  }

  function reportProgress() {
    if (!params.onProgress) return;
    const total = useSelection ? selectedTotal : imported + updated + skipped + 1;
    params.onProgress({
      applied: imported + updated,
      total: Math.max(total, 1),
      percent: total === 0 ? 100 : Math.round((processedSelected / Math.max(total, 1)) * 100),
      createdMotorIds: [...createdMotorIds],
      updatedMotorIds: [...updatedMotorIds],
      createdBrandIds: [...createdBrandIds],
      createdEngineIds: [...createdEngineIds],
    });
  }

  reportProgress();

  for (const config of params.sheetConfigs) {
    if (config.importType !== "engines") continue;
    const sheet = params.sheets.find((item) => item.name === config.sheetName);
    const mapping = params.columnMappings[config.id];
    if (!sheet || !mapping) continue;

    const brandName = effectiveBrand(config);
    const engineCode = effectiveEngineCode(config);
    if (!brandName || !engineCode) {
      errors.push(`${config.sheetName}: укажите бренд и код двигателя`);
      continue;
    }

    try {
      const rows = params.selectedEngineRows
        ? params.selectedEngineRows
            .filter((row) => row.sheetConfigId === config.id && row.selected)
            .map(previewRowToParsed)
        : buildEngineRowsFromSheet(sheet, config, mapping);

      if (rows.length === 0) continue;

      const brand = await params.catalogRepository.upsertBrand(
        params.companyId,
        brandName,
        workingBrands,
      );
      if (!workingBrands.some((item) => item.localId === brand.localId)) {
        workingBrands = [...workingBrands, brand];
        createdBrandIds.push(brand.id);
      }

      const engine = await params.catalogRepository.upsertEngine(
        params.companyId,
        brand.localId,
        engineCode,
        workingEngines,
      );
      if (!workingEngines.some((item) => item.localId === engine.localId)) {
        workingEngines = [...workingEngines, engine];
        createdEngineIds.push(engine.id);
      }

      processedSheets.add(config.sheetName);

      for (const row of rows) {
        if (params.shouldCancel?.()) break;
        if (useSelection) {
          const previewRow = params.selectedEngineRows?.find(
            (item) => item.sheetConfigId === config.id && item.serialCode === row.serialCode,
          );
          if (previewRow && !selectedKeys.has(previewRow.rowKey)) continue;
        }

        const serialKey = normalizeSerial(row.serialCode);
        if (!serialKey) {
          skipped += 1;
          continue;
        }

        const existing = bySerial.get(serialKey);
        const payload = {
          companyId: params.companyId,
          serialCode: row.serialCode.trim(),
          configuration: row.configuration,
          notes: row.notes,
          quantity: row.quantity,
          transmission: row.transmission,
          arrivalDate: row.arrivalDate ?? new Date(),
          soldDate: row.soldDate,
          brandName: brand.name,
          engineCode: engine.code,
          engineId: engine.localId,
        };

        try {
          if (existing) {
            await upsertMotorUseCase(params.repository, params.uid, existing.id, {
              ...payload,
              localId: existing.localId ?? Number(existing.id),
            });
            updated += 1;
            updatedMotorIds.push(existing.id);
          } else {
            const id = await createMotorUseCase(params.repository, params.uid, payload, workingMotors);
            const created: MotorEntity = {
              id,
              companyId: params.companyId,
              localId: Number(id),
              serialCode: payload.serialCode,
              configuration: payload.configuration ?? "",
              notes: payload.notes ?? "",
              quantity: payload.quantity ?? 1,
              transmission: payload.transmission ?? "",
              arrivalDate: payload.arrivalDate ?? null,
              soldDate: payload.soldDate ?? null,
              brandName: payload.brandName,
              engineCode: payload.engineCode,
              engineId: payload.engineId,
            };
            workingMotors = [...workingMotors, created];
            bySerial.set(serialKey, created);
            imported += 1;
            createdMotorIds.push(id);
          }
        } catch (error) {
          skipped += 1;
          const message = error instanceof Error ? error.message : "Неизвестная ошибка";
          errors.push(`${config.sheetName}: ${row.serialCode} — ${message}`);
        }
        processedSelected += 1;
        reportProgress();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Неизвестная ошибка";
      errors.push(`${config.sheetName}: ${message}`);
    }
  }

  for (const config of params.sheetConfigs) {
    if (config.importType !== "specific") continue;
    if (params.shouldCancel?.()) break;
    const sheet = params.sheets.find((item) => item.name === config.sheetName);
    const mapping = params.columnMappings[config.id];
    if (!sheet || !mapping) continue;

    const categoryName = config.categoryName.trim() || config.sheetName.trim();
    if (!categoryName) {
      errors.push(`${config.sheetName}: укажите название категории`);
      continue;
    }

    try {
      const category = await params.specificCategoryRepository.upsertCategory(
        params.companyId,
        categoryName,
        workingSpecificCategories,
        params.uid,
      );
      if (!workingSpecificCategories.some((item) => item.id === category.id)) {
        workingSpecificCategories = [...workingSpecificCategories, category];
      }

      const parsedRows = buildSpecificRowsFromSheet(sheet, mapping);
      const columnOrder = Object.keys(parsedRows[0] ?? {});
      const rows = parsedRows.map((data, index) => ({
        rowIndex: index + 1,
        data: {
          ...data,
          ...(columnOrder.length > 0 ? { _columnOrder: JSON.stringify(columnOrder) } : {}),
        },
      }));

      await params.specificCategoryRepository.replaceRecordsForCategory(
        params.companyId,
        category,
        rows,
        params.uid,
      );

      processedSheets.add(config.sheetName);
      specificRecordsImported += rows.length;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Неизвестная ошибка";
      errors.push(`${config.sheetName}: ${message}`);
    }
  }

  const totalChanges = imported + updated + specificRecordsImported;
  if (totalChanges > 0) {
    try {
      const activity = createActivityLogRepository();
      await activity.append(params.companyId, {
        actor: params.uid,
        action: "inventory.motor_imported",
        target: `import:${Date.now()}`,
        metadata: {
          imported,
          updated,
          specificRecordsImported,
          sheetsProcessed: processedSheets.size,
        },
      });
    } catch {
      // Activity log must not block import completion.
    }
  }

  return {
    imported,
    updated,
    skipped,
    sheetsProcessed: processedSheets.size,
    specificRecordsImported,
    specificCategoriesUpdated,
    errors,
    createdMotorIds,
    updatedMotorIds,
    createdBrandIds,
    createdEngineIds,
  };
}
