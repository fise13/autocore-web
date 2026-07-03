import type { WorkOrder } from '@/types/work-order';

const OIL_PATTERN = /масл|oil|залив|слив.*масл/i;
const FILTER_PATTERN = /фильтр|filter/i;
const ENGINE_PATTERN = /двигат|motor|engine|двс/i;
const DIAGNOSTIC_PATTERN = /диагност|осмотр|проверк|сканир|компьютер/i;

function textMatches(lines: string[], pattern: RegExp): boolean {
  return lines.some((line) => pattern.test(line));
}

export function orderShowsOilIntervalTag(order: WorkOrder): boolean {
  const laborTitles = order.laborLines.map((line) => line.title);
  const partNames = order.partLines.map((line) => line.name);
  const allText = [...laborTitles, ...partNames];
  const hasMotorInstall = order.motorLines.some((line) => line.outcome === 'install');
  const isOilChange =
    textMatches(allText, OIL_PATTERN) ||
    (textMatches(allText, FILTER_PATTERN) && textMatches(laborTitles, /замен|обслуж/i));
  const isEngine =
    hasMotorInstall || textMatches(laborTitles, ENGINE_PATTERN) || order.motorLines.length > 0;

  return isOilChange && !isEngine;
}
