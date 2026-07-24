import * as XLSX from "xlsx";

import { MotorEntity } from "@/domain/motor";
import { formatExportDate } from "@/lib/motors/excel-dates";
import { MotorExcelExportOptions } from "@/lib/motors/excel-types";
import { getActiveUserCopyLocale, userCopy } from "@/lib/user-copy";

function engineSheetHeaders(): string[] {
  const h = userCopy.motors.excelExport.headers;
  return [h.serial, h.configuration, h.notes, h.quantity, h.transmission, h.arrivalDate, h.soldDate];
}

function fullSheetHeaders(): string[] {
  const h = userCopy.motors.excelExport.headers;
  return [
    h.brand,
    h.engine,
    h.serial,
    h.configuration,
    h.notes,
    h.quantity,
    h.transmission,
    h.arrivalDate,
    h.soldDate,
  ];
}

function truncateSheetName(name: string): string {
  const clean = name.replace(/[/\\?*[\]:]/g, "").trim();
  if (!clean) return userCopy.motors.excelExport.sheetFallback;
  return clean.length <= 31 ? clean : clean.slice(0, 31);
}

function brandLabel(brandName: string | null | undefined): string {
  return (brandName || userCopy.motors.excelExport.brandUnspecified).toUpperCase().trim();
}

function engineLabel(engineCode: string | null | undefined): string {
  return (engineCode || userCopy.motors.excelExport.engineFallback).toUpperCase().trim();
}

function makeSheetName(brandName: string, engineCode: string): string {
  return truncateSheetName(`${brandLabel(brandName)}_${engineLabel(engineCode)}`);
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
  const exportCopy = userCopy.motors.excelExport;
  return [
    motor.brandName ?? exportCopy.brandUnspecified,
    motor.engineCode ?? exportCopy.engineFallback,
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
  const exportCopy = userCopy.motors.excelExport;
  const locale = getActiveUserCopyLocale() === "en" ? "en" : "ru";

  const available = motors.filter((motor) => !motor.soldDate && !motor.deletedAt);
  const sold = motors.filter((motor) => Boolean(motor.soldDate) && !motor.deletedAt);

  if (options.separateByEngine) {
    const byEngine = new Map<string, MotorEntity[]>();
    for (const motor of available) {
      const key = `${motor.brandName ?? exportCopy.brandUnspecified}::${motor.engineCode ?? exportCopy.engineFallback}`;
      const bucket = byEngine.get(key) ?? [];
      bucket.push(motor);
      byEngine.set(key, bucket);
    }

    const sortedKeys = [...byEngine.keys()].sort((a, b) => a.localeCompare(b, locale));
    for (const key of sortedKeys) {
      const group = byEngine.get(key) ?? [];
      if (group.length === 0) continue;
      const [brandName, engineCode] = key.split("::");
      const rows = [
        engineSheetHeaders(),
        ...group
          .sort((a, b) => (b.arrivalDate?.getTime() ?? 0) - (a.arrivalDate?.getTime() ?? 0))
          .map((motor) => motorEngineRow(motor, options.dateFormat)),
      ];
      appendUniqueSheet(workbook, usedNames, makeSheetName(brandName, engineCode), rows);
    }
  } else if (available.length > 0) {
    const rows = [
      fullSheetHeaders(),
      ...available
        .sort((a, b) => (b.arrivalDate?.getTime() ?? 0) - (a.arrivalDate?.getTime() ?? 0))
        .map((motor) => motorFullRow(motor, options.dateFormat)),
    ];
    appendUniqueSheet(workbook, usedNames, exportCopy.sheetInStock, rows);
  }

  if (options.includeSold && sold.length > 0) {
    const rows = [
      fullSheetHeaders(),
      ...sold
        .sort((a, b) => (b.soldDate?.getTime() ?? 0) - (a.soldDate?.getTime() ?? 0))
        .map((motor) => motorFullRow(motor, options.dateFormat)),
    ];
    appendUniqueSheet(workbook, usedNames, exportCopy.sheetSold, rows);
  }

  if (workbook.SheetNames.length === 0) {
    appendUniqueSheet(workbook, usedNames, exportCopy.sheetInStock, [engineSheetHeaders()]);
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
