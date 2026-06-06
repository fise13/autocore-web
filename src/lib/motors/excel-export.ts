import * as XLSX from "xlsx";

import { MotorEntity } from "@/domain/motor";
import { formatExportDate } from "@/lib/motors/excel-dates";
import { MotorExcelExportOptions } from "@/lib/motors/excel-types";

const ENGINE_SHEET_HEADERS = [
  "НОМЕР ДВИГАТЕЛЯ",
  "КОМПЛЕКТАЦИЯ",
  "ОСОБЫЕ ОТМЕТКИ",
  "КОЛ-ВО",
  "КОРОБКА",
  "ДАТА ПРИХОДА",
  "ДАТА ПРОДАЖИ",
];

const FULL_SHEET_HEADERS = [
  "БРЕНД",
  "ДВИГАТЕЛЬ",
  "НОМЕР ДВИГАТЕЛЯ",
  "КОМПЛЕКТАЦИЯ",
  "ОСОБЫЕ ОТМЕТКИ",
  "КОЛ-ВО",
  "КОРОБКА",
  "ДАТА ПРИХОДА",
  "ДАТА ПРОДАЖИ",
];

function truncateSheetName(name: string): string {
  const clean = name.replace(/[/\\?*[\]:]/g, "").trim();
  if (!clean) return "ЛИСТ";
  return clean.length <= 31 ? clean : clean.slice(0, 31);
}

function makeSheetName(brandName: string, engineCode: string): string {
  const brand = (brandName || "Не указан").toUpperCase().trim();
  const engine = (engineCode || "—").toUpperCase().trim();
  return truncateSheetName(`${brand}_${engine}`);
}

function motorEngineRow(motor: MotorEntity, dateFormat: MotorExcelExportOptions["dateFormat"]): string[] {
  return [
    motor.serialCode,
    motor.configuration,
    motor.notes,
    String(motor.quantity ?? 1),
    motor.transmission,
    formatExportDate(motor.arrivalDate, dateFormat),
    formatExportDate(motor.soldDate ?? null, dateFormat),
  ];
}

function motorFullRow(motor: MotorEntity, dateFormat: MotorExcelExportOptions["dateFormat"]): string[] {
  return [
    motor.brandName ?? "Не указан",
    motor.engineCode ?? "—",
    motor.serialCode,
    motor.configuration,
    motor.notes,
    String(motor.quantity ?? 1),
    motor.transmission,
    formatExportDate(motor.arrivalDate, dateFormat),
    formatExportDate(motor.soldDate ?? null, dateFormat),
  ];
}

function appendUniqueSheet(
  workbook: XLSX.WorkBook,
  usedNames: Set<string>,
  baseName: string,
  rows: string[][],
) {
  let name = truncateSheetName(baseName);
  let suffix = 1;
  while (usedNames.has(name.toUpperCase())) {
    const tail = `_${suffix}`;
    name = truncateSheetName(`${baseName.slice(0, Math.max(1, 31 - tail.length))}${tail}`);
    suffix += 1;
  }
  usedNames.add(name.toUpperCase());

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, name);
}

export function buildMotorExportWorkbook(
  motors: MotorEntity[],
  options: MotorExcelExportOptions,
): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new();
  const usedNames = new Set<string>();

  const available = motors.filter((motor) => !motor.soldDate && !motor.deletedAt);
  const sold = motors.filter((motor) => Boolean(motor.soldDate) && !motor.deletedAt);

  if (options.separateByEngine) {
    const byEngine = new Map<string, MotorEntity[]>();
    for (const motor of available) {
      const key = `${motor.brandName ?? "Не указан"}::${motor.engineCode ?? "—"}`;
      const bucket = byEngine.get(key) ?? [];
      bucket.push(motor);
      byEngine.set(key, bucket);
    }

    const sortedKeys = [...byEngine.keys()].sort((a, b) => a.localeCompare(b, "ru"));
    for (const key of sortedKeys) {
      const group = byEngine.get(key) ?? [];
      if (group.length === 0) continue;
      const [brandName, engineCode] = key.split("::");
      const rows = [
        ENGINE_SHEET_HEADERS,
        ...group
          .sort((a, b) => (b.arrivalDate?.getTime() ?? 0) - (a.arrivalDate?.getTime() ?? 0))
          .map((motor) => motorEngineRow(motor, options.dateFormat)),
      ];
      appendUniqueSheet(workbook, usedNames, makeSheetName(brandName, engineCode), rows);
    }
  } else if (available.length > 0) {
    const rows = [
      FULL_SHEET_HEADERS,
      ...available
        .sort((a, b) => (b.arrivalDate?.getTime() ?? 0) - (a.arrivalDate?.getTime() ?? 0))
        .map((motor) => motorFullRow(motor, options.dateFormat)),
    ];
    appendUniqueSheet(workbook, usedNames, "В НАЛИЧИИ", rows);
  }

  if (options.includeSold && sold.length > 0) {
    const rows = [
      FULL_SHEET_HEADERS,
      ...sold
        .sort((a, b) => (b.soldDate?.getTime() ?? 0) - (a.soldDate?.getTime() ?? 0))
        .map((motor) => motorFullRow(motor, options.dateFormat)),
    ];
    appendUniqueSheet(workbook, usedNames, "ПРОДАННЫЕ", rows);
  }

  if (workbook.SheetNames.length === 0) {
    appendUniqueSheet(workbook, usedNames, "В НАЛИЧИИ", [ENGINE_SHEET_HEADERS]);
  }

  return workbook;
}

export function exportMotorsToExcelFile(
  motors: MotorEntity[],
  filename: string,
  options: MotorExcelExportOptions,
) {
  const workbook = buildMotorExportWorkbook(motors, options);
  XLSX.writeFile(workbook, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}

export function buildExportFilename(prefix = "autocore-motors"): string {
  const now = new Date();
  const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return `${prefix}-${stamp}.xlsx`;
}
