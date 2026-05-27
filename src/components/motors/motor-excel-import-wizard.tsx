"use client";

import { useMemo, useState } from "react";

import { commitMotorExcelImport } from "@/application/use-cases/commit-motor-excel-import";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MotorEntity } from "@/domain/motor";
import { SheetColumnMapping } from "@/lib/motors/excel-column-mapping";
import {
  buildEngineRowsFromSheet,
  buildSpecificRowsFromSheet,
  createSheetColumnMapping,
  mappingHasSerialColumn,
} from "@/lib/motors/excel-import-engine-rows";
import {
  createSheetImportConfig,
  isSheetConfigured,
  SheetImportConfig,
  SheetImportType,
} from "@/lib/motors/excel-sheet-config";
import { ExcelSheetData, MotorExcelImportResult } from "@/lib/motors/excel-types";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type WizardStep = "analyze" | "selectType" | "preview";

type MotorExcelImportWizardProps = {
  sheets: ExcelSheetData[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  uid: string;
  companyId: string;
  repository: MotorRepository;
  catalogRepository: CatalogRepository;
  specificCategoryRepository: SpecificCategoryRepository;
  existingMotors: MotorEntity[];
  existingBrands: BrandEntity[];
  existingEngines: EngineEntity[];
  existingSpecificCategories: SpecificCategoryEntity[];
  onComplete: (result: MotorExcelImportResult) => void;
};

const importTypeOptions: { value: SheetImportType; label: string; hint: string }[] = [
  { value: "engines", label: "Основной (двигатели)", hint: "Данные попадут в каталог моторов" },
  { value: "specific", label: "Специфичный лист", hint: "Ремонт, после Дэна и другие категории в боковой панели" },
  { value: "skip", label: "Пропустить", hint: "Лист не импортируется" },
];

function buildInitialState(sheets: ExcelSheetData[]) {
  const sheetConfigs = sheets.map((sheet) => createSheetImportConfig(sheet.name, sheet.rows));
  const columnMappings = Object.fromEntries(
    sheetConfigs.map((config) => {
      const sheet = sheets.find((item) => item.name === config.sheetName);
      return [
        config.id,
        createSheetColumnMapping(sheet ?? { name: config.sheetName, rows: [] }, config.importType),
      ];
    }),
  );
  return { sheetConfigs, columnMappings };
}

export function MotorExcelImportWizard({
  sheets,
  open,
  onOpenChange,
  uid,
  companyId,
  repository,
  catalogRepository,
  specificCategoryRepository,
  existingMotors,
  existingBrands,
  existingEngines,
  existingSpecificCategories,
  onComplete,
}: MotorExcelImportWizardProps) {
  const initial = useMemo(() => buildInitialState(sheets), [sheets]);
  const [step, setStep] = useState<WizardStep>("analyze");
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sheetConfigs, setSheetConfigs] = useState<SheetImportConfig[]>(initial.sheetConfigs);
  const [columnMappings, setColumnMappings] = useState<Record<string, SheetColumnMapping>>(
    initial.columnMappings,
  );

  const previewSummary = useMemo(() => {
    let engineRows = 0;
    let specificRows = 0;
    for (const config of sheetConfigs) {
      const sheet = sheets.find((item) => item.name === config.sheetName);
      const mapping = columnMappings[config.id];
      if (!sheet || !mapping) continue;
      if (config.importType === "engines") {
        engineRows += buildEngineRowsFromSheet(sheet, config, mapping).length;
      } else if (config.importType === "specific") {
        specificRows += buildSpecificRowsFromSheet(sheet, mapping).length;
      }
    }
    return { engineRows, specificRows, total: engineRows + specificRows };
  }, [columnMappings, sheetConfigs, sheets]);

  function updateSheetConfig(configId: string, patch: Partial<SheetImportConfig>) {
    setSheetConfigs((current) =>
      current.map((config) => (config.id === configId ? { ...config, ...patch } : config)),
    );

    if (patch.importType) {
      const config = sheetConfigs.find((item) => item.id === configId);
      const sheet = sheets.find((item) => item.name === config?.sheetName);
      if (sheet) {
        setColumnMappings((current) => ({
          ...current,
          [configId]: createSheetColumnMapping(sheet, patch.importType ?? "skip"),
        }));
      }
    }
  }

  function canProceed(): boolean {
    if (step === "analyze") return sheetConfigs.length > 0;
    if (step === "selectType") {
      return sheetConfigs.every((config) => {
        const mapping = columnMappings[config.id];
        return isSheetConfigured(config, mapping ? mappingHasSerialColumn(mapping) : false);
      });
    }
    return previewSummary.total > 0;
  }

  async function handleImport() {
    setImporting(true);
    setError(null);
    try {
      const result = await commitMotorExcelImport({
        uid,
        companyId,
        repository,
        catalogRepository,
        specificCategoryRepository,
        existingMotors,
        existingBrands,
        existingEngines,
        existingSpecificCategories,
        sheets,
        sheetConfigs,
        columnMappings,
      });
      if (result.imported + result.updated + result.specificRecordsImported === 0) {
        throw new Error("Не удалось импортировать строки. Проверьте тип листов, бренд/двигатель и колонку с номером.");
      }
      onComplete(result);
      onOpenChange(false);
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Ошибка импорта");
    } finally {
      setImporting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>Импорт Excel</DialogTitle>
          <DialogDescription>
            {step === "analyze" && "Шаг 1 — анализ файла"}
            {step === "selectType" && "Шаг 2 — тип каждого листа, бренд и двигатель"}
            {step === "preview" && "Шаг 3 — предпросмотр перед импортом"}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-auto px-6 py-4">
          {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}

          {step === "analyze" ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Найдено листов: {sheetConfigs.length}</p>
              {sheetConfigs.map((config) => (
                <div key={config.id} className="rounded-lg border p-3">
                  <p className="font-medium">{config.sheetName}</p>
                  <p className="text-xs text-muted-foreground">Строк: {config.rowCount}</p>
                  {config.previewRows[0]?.length ? (
                    <p className="mt-2 truncate text-xs text-muted-foreground">
                      Заголовки: {config.previewRows[0].filter(Boolean).slice(0, 6).join(" · ")}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          {step === "selectType" ? (
            <div className="space-y-4">
              {sheetConfigs.map((config) => {
                const mapping = columnMappings[config.id];
                const serialMapped = mapping ? mappingHasSerialColumn(mapping) : false;
                return (
                  <div key={config.id} className="space-y-3 rounded-lg border p-4">
                    <div>
                      <p className="font-medium">{config.sheetName}</p>
                      <p className="text-xs text-muted-foreground">
                        {serialMapped ? "Колонка с номером найдена" : "Укажите тип «Основной» и проверьте заголовки"}
                      </p>
                    </div>

                    <div className="grid gap-2">
                      <Label>Тип листа</Label>
                      <div className="grid gap-2">
                        {importTypeOptions.map((option) => (
                          <label key={option.value} className="flex cursor-pointer items-start gap-2 rounded-md border px-3 py-2">
                            <input
                              type="radio"
                              name={`import-type-${config.id}`}
                              checked={config.importType === option.value}
                              onChange={() => updateSheetConfig(config.id, { importType: option.value })}
                              className="mt-1"
                            />
                            <span>
                              <span className="block text-sm font-medium">{option.label}</span>
                              <span className="block text-xs text-muted-foreground">{option.hint}</span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {config.importType === "engines" ? (
                      <div className="grid gap-3">
                        {config.customBrand || config.customEngineCode ? (
                          <p className="text-xs text-emerald-700">
                            Из названия листа: {config.customBrand || "—"} · {config.customEngineCode || "—"}
                          </p>
                        ) : null}
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1.5">
                            <Label htmlFor={`brand-${config.id}`}>Бренд</Label>
                            {existingBrands.length > 0 ? (
                              <Select
                                value={
                                  existingBrands.find(
                                    (brand) =>
                                      brand.name.localeCompare(config.customBrand, "ru", {
                                        sensitivity: "accent",
                                      }) === 0,
                                  )?.name ?? ""
                                }
                                onValueChange={(value) =>
                                  updateSheetConfig(config.id, { customBrand: value ?? undefined })
                                }
                              >
                                <SelectTrigger id={`brand-${config.id}`}>
                                  <SelectValue placeholder="Выберите из списка" />
                                </SelectTrigger>
                                <SelectContent>
                                  {existingBrands.map((brand) => (
                                    <SelectItem key={brand.id} value={brand.name}>
                                      {brand.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : null}
                            <Input
                              value={config.customBrand}
                              onChange={(event) =>
                                updateSheetConfig(config.id, { customBrand: event.target.value })
                              }
                              placeholder="Subaru"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor={`engine-${config.id}`}>Код двигателя</Label>
                            <Input
                              id={`engine-${config.id}`}
                              value={config.customEngineCode}
                              onChange={(event) =>
                                updateSheetConfig(config.id, {
                                  customEngineCode: event.target.value,
                                })
                              }
                              placeholder="ej253"
                            />
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {config.importType === "specific" ? (
                      <div className="space-y-1.5">
                        <Label htmlFor={`category-${config.id}`}>Название категории</Label>
                        <Input
                          id={`category-${config.id}`}
                          value={config.categoryName}
                          onChange={(event) =>
                            updateSheetConfig(config.id, { categoryName: event.target.value })
                          }
                          placeholder={config.sheetName}
                        />
                        <p className="text-xs text-muted-foreground">
                          Категория появится в боковой панели «Специфичные».
                        </p>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}

          {step === "preview" ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Будет импортировано строк:{" "}
                <span className="font-medium text-foreground">{previewSummary.total}</span>
                {previewSummary.specificRows > 0 ? (
                  <span>
                    {" "}
                    (моторы: {previewSummary.engineRows}, специфичные: {previewSummary.specificRows})
                  </span>
                ) : null}
              </p>
              {sheetConfigs
                .filter((config) => config.importType === "engines")
                .map((config) => {
                  const sheet = sheets.find((item) => item.name === config.sheetName);
                  const mapping = columnMappings[config.id];
                  if (!sheet || !mapping) return null;
                  const rows = buildEngineRowsFromSheet(sheet, config, mapping).slice(0, 5);
                  return (
                    <div key={config.id} className="rounded-lg border">
                      <div className="border-b px-3 py-2 text-sm font-medium">
                        {config.sheetName} · {config.customBrand} {config.customEngineCode}
                      </div>
                      <div className="overflow-auto">
                        <table className="min-w-full text-xs">
                          <thead>
                            <tr className="border-b bg-muted/40 text-left">
                              <th className="px-3 py-2">Номер</th>
                              <th className="px-3 py-2">Комплектация</th>
                              <th className="px-3 py-2">Кол-во</th>
                              <th className="px-3 py-2">Приход</th>
                              <th className="px-3 py-2">Продажа</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((row, rowIndex) => (
                              <tr key={`${config.id}-${row.serialCode}-${rowIndex}`} className="border-b last:border-0">
                                <td className="px-3 py-2">{row.serialCode}</td>
                                <td className="px-3 py-2">{row.configuration}</td>
                                <td className="px-3 py-2">{row.quantity}</td>
                                <td className="px-3 py-2">
                                  {row.arrivalDate ? row.arrivalDate.toLocaleDateString("ru-RU") : ""}
                                </td>
                                <td className="px-3 py-2">
                                  {row.soldDate ? row.soldDate.toLocaleDateString("ru-RU") : ""}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              {sheetConfigs
                .filter((config) => config.importType === "specific")
                .map((config) => {
                  const sheet = sheets.find((item) => item.name === config.sheetName);
                  const mapping = columnMappings[config.id];
                  if (!sheet || !mapping) return null;
                  const rows = buildSpecificRowsFromSheet(sheet, mapping).slice(0, 5);
                  const headers = Object.keys(rows[0] ?? {});
                  return (
                    <div key={config.id} className="rounded-lg border">
                      <div className="border-b px-3 py-2 text-sm font-medium">
                        {config.categoryName || config.sheetName} · специфичный лист
                      </div>
                      <div className="overflow-auto">
                        <table className="min-w-full text-xs">
                          <thead>
                            <tr className="border-b bg-muted/40 text-left">
                              {headers.slice(0, 5).map((header) => (
                                <th key={header} className="px-3 py-2">
                                  {header}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((row, rowIndex) => (
                              <tr key={`${config.id}-specific-${rowIndex}`} className="border-b last:border-0">
                                {headers.slice(0, 5).map((header) => (
                                  <td key={header} className="px-3 py-2">
                                    {row[header] ?? ""}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : null}
        </div>

        <DialogFooter className="border-t px-6 py-4">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={importing}>
            Отмена
          </Button>
          {step !== "analyze" ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(step === "preview" ? "selectType" : "analyze")}
              disabled={importing}
            >
              Назад
            </Button>
          ) : null}
          {step !== "preview" ? (
            <Button
              type="button"
              onClick={() => setStep(step === "analyze" ? "selectType" : "preview")}
              disabled={!canProceed() || importing}
            >
              Далее
            </Button>
          ) : (
            <Button type="button" onClick={() => void handleImport()} disabled={!canProceed() || importing}>
              {importing ? "Импорт…" : "Импортировать"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
