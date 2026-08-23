import { useCallback, useMemo, useState } from 'react';

import { haptics } from '@/theme';
import { resolveQuickSpecificCategories } from '@/lib/work-order/category-presets';
import {
  assigneeRoleLabel,
  formatMoney,
  laborLineLabel,
  nextComposerLineId,
  parseGroupedNumber,
  resolveAssigneeRole,
} from '@/lib/work-order/composer-utils';
import { formatMotorLineLabel } from '@/lib/motors/format-motor-display-name';
import type { CompanyAppConfig } from '@/types/company-config';
import type { InventoryItem } from '@/types/inventory';
import type { MotorEntity } from '@/types/motor';
import type { CompanyEmployee } from '@/types/rbac';
import type { WorkOrderMotorOutcome } from '@/types/work-order';
import {
  INITIAL_LABOR_DRAFT,
  type LaborDraft,
  type LaborLineDraft,
  type MotorLineDraft,
  type PartLineDraft,
} from '@/stores/order-composition-store';

import { resolveInventoryUnitPrice } from '../hooks/use-work-order-composer-options';

type UseOrderCompositionFormOptions = {
  employees: CompanyEmployee[];
  inventoryItems: InventoryItem[];
  availableMotors: MotorEntity[];
  companyConfig?: CompanyAppConfig | null;
  currentUserId?: string;
  initialLaborLines?: LaborLineDraft[];
  initialPartLines?: PartLineDraft[];
  initialMotorLines?: MotorLineDraft[];
};

export function useOrderCompositionForm({
  employees,
  inventoryItems,
  availableMotors,
  companyConfig,
  currentUserId,
  initialLaborLines = [],
  initialPartLines = [],
  initialMotorLines = [],
}: UseOrderCompositionFormOptions) {
  const [laborDraft, setLaborDraft] = useState<LaborDraft>(INITIAL_LABOR_DRAFT);
  const [laborLines, setLaborLines] = useState<LaborLineDraft[]>(initialLaborLines);
  const [partSku, setPartSku] = useState('');
  const [partName, setPartName] = useState('');
  const [partQuantity, setPartQuantity] = useState('1');
  const [partUnitPrice, setPartUnitPrice] = useState('');
  const [partLines, setPartLines] = useState<PartLineDraft[]>(initialPartLines);
  const [motorSerial, setMotorSerial] = useState('');
  const [motorOutcome, setMotorOutcome] = useState<WorkOrderMotorOutcome>('install');
  const [motorPrice, setMotorPrice] = useState('');
  const [motorWarrantyTemplateId, setMotorWarrantyTemplateId] = useState('');
  const [motorLines, setMotorLines] = useState<MotorLineDraft[]>(initialMotorLines);
  const [specificCategoryId, setSpecificCategoryId] = useState('');
  const [specificPartName, setSpecificPartName] = useState('');
  const [specificPartPrice, setSpecificPartPrice] = useState('');
  const [specificWarrantyTemplateId, setSpecificWarrantyTemplateId] = useState('none');
  const [error, setError] = useState<string | null>(null);

  const quickSpecificCategories = useMemo(
    () => resolveQuickSpecificCategories(companyConfig?.specificCategories),
    [companyConfig?.specificCategories],
  );

  const assigneeOptions = useMemo(
    () =>
      employees.map((employee) => ({
        value: employee.fullName || employee.email,
        label: assigneeRoleLabel(employee),
      })),
    [employees],
  );

  const regularPartLines = useMemo(
    () => partLines.filter((line) => line.source !== 'specific_quick'),
    [partLines],
  );

  const specificPartLines = useMemo(
    () => partLines.filter((line) => line.source === 'specific_quick'),
    [partLines],
  );

  const patchLaborDraft = useCallback((patch: Partial<LaborDraft>) => {
    setLaborDraft((current) => ({ ...current, ...patch }));
  }, []);

  const commitAssignee = useCallback(
    (name: string) => {
      const employee = employees.find(
        (entry) => (entry.fullName || entry.email).toLowerCase() === name.trim().toLowerCase(),
      );
      if (!employee) {
        patchLaborDraft({ assigneeName: name, assigneeId: '' });
        return;
      }
      patchLaborDraft({
        assigneeId: employee.uid || employee.id,
        assigneeName: employee.fullName || employee.email,
        assigneeRole: resolveAssigneeRole(employee),
      });
    },
    [employees, patchLaborDraft],
  );

  const assignSelf = useCallback(() => {
    if (!currentUserId) return;
    const employee = employees.find((entry) => entry.uid === currentUserId);
    if (employee) {
      commitAssignee(employee.fullName || employee.email);
      return;
    }
    patchLaborDraft({
      assigneeId: currentUserId,
      assigneeName: 'Me',
      assigneeRole: 'mechanic',
    });
  }, [commitAssignee, currentUserId, employees, patchLaborDraft]);

  const addLabor = useCallback(() => {
    const title = laborDraft.title.trim();
    const pricingMode = laborDraft.pricingMode;
    const unitPrice = parseGroupedNumber(laborDraft.unitPrice);
    const hours = parseGroupedNumber(laborDraft.hours);
    const assigneeName = laborDraft.assigneeName.trim();

    if (!title) {
      setError('Enter a job title');
      return;
    }
    if (!assigneeName && !laborDraft.assigneeId) {
      setError('Assign someone to this job');
      return;
    }
    if (pricingMode === 'fixed' && unitPrice <= 0) {
      setError('Enter the job amount');
      return;
    }
    if (pricingMode === 'hourly' && (hours <= 0 || unitPrice <= 0)) {
      setError('Enter hours and an hourly rate');
      return;
    }

    const employee = employees.find(
      (entry) =>
        laborDraft.assigneeId &&
        (entry.uid === laborDraft.assigneeId || entry.id === laborDraft.assigneeId),
    );
    const matchedByName = employees.find(
      (entry) => (entry.fullName || entry.email).toLowerCase() === assigneeName.toLowerCase(),
    );
    const resolvedEmployee = employee ?? matchedByName;
    const assigneeId = resolvedEmployee?.uid || resolvedEmployee?.id || laborDraft.assigneeId;
    const displayName = resolvedEmployee ? '' : assigneeName;

    setLaborLines((lines) => [
      ...lines,
      {
        id: nextComposerLineId('labor'),
        title,
        pricingMode,
        hours: pricingMode === 'hourly' ? hours : 0,
        unitPrice,
        assigneeIds: assigneeId ? [assigneeId] : [],
        ...(displayName ? { assigneeDisplayNames: [displayName] } : {}),
        assigneeRole: resolvedEmployee
          ? resolveAssigneeRole(resolvedEmployee)
          : laborDraft.assigneeRole,
      },
    ]);
    setLaborDraft({ ...INITIAL_LABOR_DRAFT, assigneeRole: laborDraft.assigneeRole });
    setError(null);
    haptics.light();
  }, [employees, laborDraft]);

  const addPart = useCallback(() => {
    const name = partName.trim();
    const sku = partSku.trim();
    const quantity = parseGroupedNumber(partQuantity) || 1;
    const manualPrice = parseGroupedNumber(partUnitPrice);

    if (!name) {
      setError('Enter a part name');
      return;
    }

    const item =
      inventoryItems.find((entry) => sku && entry.sku === sku) ??
      inventoryItems.find((entry) => entry.name.toLowerCase() === name.toLowerCase());

    if (item) {
      setPartLines((lines) => [
        ...lines,
        {
          id: nextComposerLineId('part'),
          itemId: item.id,
          source: 'warehouse',
          sku: item.sku,
          name: item.name,
          quantity,
          unitPrice: manualPrice > 0 ? manualPrice : resolveInventoryUnitPrice(item),
          unitCost: item.purchasePrice ?? 0,
        },
      ]);
      setPartSku('');
      setPartName('');
      setPartQuantity('1');
      setPartUnitPrice('');
      setError(null);
      haptics.light();
      return;
    }

    if (manualPrice <= 0) {
      setError('Enter a price for this off-inventory part');
      return;
    }

    setPartLines((lines) => [
      ...lines,
      {
        id: nextComposerLineId('part'),
        source: 'adhoc',
        ...(sku ? { sku } : {}),
        name,
        quantity,
        unitPrice: manualPrice,
        unitCost: manualPrice,
      },
    ]);
    setPartSku('');
    setPartName('');
    setPartQuantity('1');
    setPartUnitPrice('');
    setError(null);
    haptics.light();
  }, [inventoryItems, partName, partQuantity, partSku, partUnitPrice]);

  const addMotor = useCallback(() => {
    const serial = motorSerial.trim();
    const motor = availableMotors.find((entry) => entry.serialCode === serial);
    if (!motor) {
      setError('Motor not found');
      haptics.warning();
      return;
    }
    const price = parseGroupedNumber(motorPrice);
    setMotorLines((lines) => [
      ...lines,
      {
        id: nextComposerLineId('motor'),
        label: formatMotorLineLabel(motor, { includeSerial: true }),
        unitPrice: price,
        motorId: motor.id,
        serialCode: motor.serialCode,
        brandName: motor.brandName,
        engineCode: motor.engineCode,
        configuration: motor.configuration,
        outcome: motorOutcome,
        ...(motorWarrantyTemplateId ? { warrantyTemplateId: motorWarrantyTemplateId } : {}),
      },
    ]);
    setMotorSerial('');
    setMotorPrice('');
    setMotorWarrantyTemplateId('');
    setError(null);
    haptics.light();
  }, [availableMotors, motorOutcome, motorPrice, motorSerial, motorWarrantyTemplateId]);

  const addSpecificPart = useCallback(() => {
    const category = quickSpecificCategories.find((entry) => entry.id === specificCategoryId);
    const name = specificPartName.trim();
    const price = parseGroupedNumber(specificPartPrice);
    if (!category) {
      setError('Select a category');
      return;
    }
    if (!name) {
      setError('Enter a line item name');
      return;
    }
    if (price <= 0) {
      setError('Enter a price');
      return;
    }
    setPartLines((lines) => [
      ...lines,
      {
        id: nextComposerLineId('specific'),
        source: 'specific_quick',
        name,
        quantity: 1,
        unitPrice: price,
        unitCost: 0,
        specificCategoryId: category.id,
        specificCategoryName: category.name,
        warrantyTemplateId:
          !specificWarrantyTemplateId || specificWarrantyTemplateId === 'none'
            ? 'none'
            : specificWarrantyTemplateId,
      },
    ]);
    setSpecificCategoryId('');
    setSpecificPartName('');
    setSpecificPartPrice('');
    setSpecificWarrantyTemplateId('none');
    setError(null);
    haptics.light();
  }, [
    quickSpecificCategories,
    specificCategoryId,
    specificPartName,
    specificPartPrice,
    specificWarrantyTemplateId,
  ]);

  const removeLabor = useCallback((id: string) => {
    setLaborLines((lines) => lines.filter((line) => line.id !== id));
    haptics.light();
  }, []);

  const removePart = useCallback((id: string) => {
    setPartLines((lines) => lines.filter((line) => line.id !== id));
    haptics.light();
  }, []);

  const removeMotor = useCallback((id: string) => {
    setMotorLines((lines) => lines.filter((line) => line.id !== id));
    haptics.light();
  }, []);

  const fillPartFromInventory = useCallback(
    (skuOrName: string, by: 'sku' | 'name') => {
      const item =
        by === 'sku'
          ? inventoryItems.find((entry) => entry.sku === skuOrName)
          : inventoryItems.find((entry) => entry.name === skuOrName);
      if (!item) return;
      setPartSku(item.sku);
      setPartName(item.name);
      setPartUnitPrice(String(resolveInventoryUnitPrice(item)));
    },
    [inventoryItems],
  );

  const laborLineItems = useMemo(
    () => laborLines.map((line) => ({ id: line.id, label: laborLineLabel(line, employees) })),
    [employees, laborLines],
  );

  const regularPartLineItems = useMemo(
    () =>
      regularPartLines.map((line) => {
        const tag = line.source === 'adhoc' || !line.itemId ? ' · one-off' : '';
        return {
          id: line.id,
          label: `${line.name}${tag} × ${line.quantity} = ${formatMoney(line.quantity * line.unitPrice)}`,
        };
      }),
    [regularPartLines],
  );

  const specificPartLineItems = useMemo(
    () =>
      specificPartLines.map((line) => ({
        id: line.id,
        label: `${line.specificCategoryName ? `${line.specificCategoryName} · ` : ''}${line.name} = ${formatMoney(line.unitPrice)}`,
      })),
    [specificPartLines],
  );

  const motorLineItems = useMemo(
    () =>
      motorLines.map((line) => ({
        id: line.id,
        label: `${line.label} · ${line.outcome === 'install' ? 'install' : 'sale'} · ${formatMoney(line.unitPrice)}`,
      })),
    [motorLines],
  );

  return useMemo(
    () => ({
      laborDraft,
      patchLaborDraft,
      commitAssignee,
      assignSelf,
      assigneeOptions,
      laborLines,
      setLaborLines,
      partSku,
      setPartSku,
      partName,
      setPartName,
      partQuantity,
      setPartQuantity,
      partUnitPrice,
      setPartUnitPrice,
      partLines,
      setPartLines,
      motorSerial,
      setMotorSerial,
      motorOutcome,
      setMotorOutcome,
      motorPrice,
      setMotorPrice,
      motorWarrantyTemplateId,
      setMotorWarrantyTemplateId,
      motorLines,
      setMotorLines,
      specificCategoryId,
      setSpecificCategoryId,
      specificPartName,
      setSpecificPartName,
      specificPartPrice,
      setSpecificPartPrice,
      specificWarrantyTemplateId,
      setSpecificWarrantyTemplateId,
      quickSpecificCategories,
      regularPartLines,
      specificPartLines,
      addLabor,
      addPart,
      addMotor,
      addSpecificPart,
      removeLabor,
      removePart,
      removeMotor,
      fillPartFromInventory,
      laborLineItems,
      regularPartLineItems,
      specificPartLineItems,
      motorLineItems,
      error,
      setError,
    }),
    [
      addLabor,
      addMotor,
      addPart,
      addSpecificPart,
      assignSelf,
      assigneeOptions,
      commitAssignee,
      error,
      fillPartFromInventory,
      laborDraft,
      laborLineItems,
      laborLines,
      motorLineItems,
      motorLines,
      motorOutcome,
      motorPrice,
      motorSerial,
      motorWarrantyTemplateId,
      partLines,
      partName,
      partQuantity,
      partSku,
      partUnitPrice,
      patchLaborDraft,
      quickSpecificCategories,
      regularPartLineItems,
      regularPartLines,
      removeLabor,
      removeMotor,
      removePart,
      specificCategoryId,
      specificPartLineItems,
      specificPartLines,
      specificPartName,
      specificPartPrice,
      specificWarrantyTemplateId,
    ],
  );
}
