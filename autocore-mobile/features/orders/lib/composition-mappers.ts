import type { WorkOrder } from '@/types/work-order';

import type { LaborLineDraft, MotorLineDraft, PartLineDraft } from '@/stores/order-composition-store';
import { laborLineTotal } from '@/lib/work-order/labor-pricing';

export function mapOrderToCompositionDrafts(order: WorkOrder): {
  laborLines: LaborLineDraft[];
  partLines: PartLineDraft[];
  motorLines: MotorLineDraft[];
} {
  return {
    laborLines: order.laborLines.map((line) => ({
      id: line.id,
      title: line.title,
      pricingMode: line.pricingMode ?? 'fixed',
      hours: line.hours,
      unitPrice: line.unitPrice,
      assigneeIds: line.assigneeIds,
      assigneeDisplayNames: line.assigneeDisplayNames,
      assigneeRole: line.assigneeRole,
    })),
    partLines: order.partLines.map((line) => ({
      id: line.id,
      name: line.name,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      sku: line.sku,
      itemId: line.itemId,
      source: line.source ?? 'warehouse',
      unitCost: line.unitCost,
      specificCategoryId: line.specificCategoryId,
      specificCategoryName: line.specificCategoryName,
      warrantyTemplateId: line.warrantyTemplateId,
    })),
    motorLines: order.motorLines.map((line) => ({
      id: line.id,
      label: [line.brandName, line.engineCode, line.serialCode].filter(Boolean).join(' ') || line.serialCode,
      unitPrice: line.unitPrice,
      motorId: line.motorId,
      serialCode: line.serialCode,
      brandName: line.brandName,
      engineCode: line.engineCode,
      configuration: line.configuration,
      outcome: line.outcome,
      warrantyTemplateId: line.warrantyTemplateId,
    })),
  };
}

export function mapCompositionToWorkOrderLines(
  laborLines: LaborLineDraft[],
  partLines: PartLineDraft[],
  motorLines: MotorLineDraft[],
) {
  const mappedLaborLines = laborLines.map((line) => ({
    id: line.id,
    title: line.title,
    pricingMode: line.pricingMode,
    hours: line.hours,
    unitPrice: line.unitPrice,
    assigneeIds: line.assigneeIds,
    ...(line.assigneeDisplayNames?.length ? { assigneeDisplayNames: line.assigneeDisplayNames } : {}),
    assigneeRole: line.assigneeRole,
  }));

  const mappedPartLines = partLines.map((line) => ({
    id: line.id,
    ...(line.itemId ? { itemId: line.itemId } : {}),
    ...(line.sku ? { sku: line.sku } : {}),
    ...(line.specificCategoryId ? { specificCategoryId: line.specificCategoryId } : {}),
    ...(line.specificCategoryName ? { specificCategoryName: line.specificCategoryName } : {}),
    ...(line.warrantyTemplateId ? { warrantyTemplateId: line.warrantyTemplateId } : {}),
    name: line.name,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    unitCost: line.unitCost,
    source: line.source,
  }));

  const mappedMotorLines = motorLines.map((line) => ({
    id: line.id,
    motorId: line.motorId,
    serialCode: line.serialCode,
    ...(line.brandName ? { brandName: line.brandName } : {}),
    ...(line.engineCode ? { engineCode: line.engineCode } : {}),
    ...(line.configuration ? { configuration: line.configuration } : {}),
    unitPrice: line.unitPrice,
    outcome: line.outcome,
    ...(line.warrantyTemplateId ? { warrantyTemplateId: line.warrantyTemplateId } : {}),
  }));

  return { mappedLaborLines, mappedPartLines, mappedMotorLines };
}

export function compositionGrandTotal(
  laborLines: LaborLineDraft[],
  partLines: PartLineDraft[],
  motorLines: MotorLineDraft[],
): number {
  const labor = laborLines.reduce((sum, line) => sum + laborLineTotal(line), 0);
  const parts = partLines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
  const motors = motorLines.reduce((sum, line) => sum + line.unitPrice, 0);
  return labor + parts + motors;
}

export function isSellOnlyComposition(partLines: PartLineDraft[], motorLines: MotorLineDraft[]): boolean {
  const hasInstallMotor = motorLines.some((line) => line.outcome === 'install');
  const hasWarehouseParts = partLines.some((line) => line.source === 'warehouse' || line.source === 'adhoc');
  if (hasInstallMotor || hasWarehouseParts) return false;
  return (
    partLines.some((line) => line.source === 'specific_quick') ||
    motorLines.some((line) => line.outcome === 'sell')
  );
}
