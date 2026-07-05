import { create } from 'zustand';

import type {
  WorkOrderAssigneeRole,
  WorkOrderLaborPricingMode,
  WorkOrderMotorOutcome,
} from '@/types/work-order';

export type LaborDraft = {
  title: string;
  pricingMode: WorkOrderLaborPricingMode;
  hours: string;
  unitPrice: string;
  assigneeId: string;
  assigneeName: string;
  assigneeRole: WorkOrderAssigneeRole;
};

export type LaborLineDraft = {
  id: string;
  title: string;
  pricingMode: WorkOrderLaborPricingMode;
  hours: number;
  unitPrice: number;
  assigneeIds: string[];
  assigneeDisplayNames?: string[];
  assigneeRole: WorkOrderAssigneeRole;
};

export type PartLineDraft = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  sku?: string;
  itemId?: string;
  source: 'warehouse' | 'adhoc' | 'specific_quick';
  unitCost: number;
  specificCategoryId?: string;
  specificCategoryName?: string;
  warrantyTemplateId?: string;
};

export type MotorLineDraft = {
  id: string;
  label: string;
  unitPrice: number;
  motorId: string;
  serialCode: string;
  brandName?: string;
  engineCode?: string;
  configuration?: string;
  outcome: WorkOrderMotorOutcome;
  warrantyTemplateId?: string;
};

export type PendingCompositionAdd =
  | { type: 'part'; itemId: string }
  | { type: 'motor'; motorId: string; outcome: WorkOrderMotorOutcome };

export const INITIAL_LABOR_DRAFT: LaborDraft = {
  title: '',
  pricingMode: 'fixed',
  hours: '1',
  unitPrice: '',
  assigneeId: '',
  assigneeName: '',
  assigneeRole: 'mechanic',
};

type OrderCompositionState = {
  targetOrderId: string | 'new' | null;
  laborLines: LaborLineDraft[];
  partLines: PartLineDraft[];
  motorLines: MotorLineDraft[];
  pendingAdd: PendingCompositionAdd | null;
  setTargetOrderId: (id: string | 'new' | null) => void;
  setLaborLines: (lines: LaborLineDraft[]) => void;
  setPartLines: (lines: PartLineDraft[]) => void;
  setMotorLines: (lines: MotorLineDraft[]) => void;
  queuePart: (itemId: string) => void;
  queueMotor: (motorId: string, outcome?: WorkOrderMotorOutcome) => void;
  takePendingAdd: () => PendingCompositionAdd | null;
  reset: () => void;
};

const initialState = {
  targetOrderId: null as string | 'new' | null,
  laborLines: [] as LaborLineDraft[],
  partLines: [] as PartLineDraft[],
  motorLines: [] as MotorLineDraft[],
  pendingAdd: null as PendingCompositionAdd | null,
};

export const useOrderCompositionStore = create<OrderCompositionState>((set, get) => ({
  ...initialState,
  setTargetOrderId: (id) => set({ targetOrderId: id }),
  setLaborLines: (lines) => set({ laborLines: lines }),
  setPartLines: (lines) => set({ partLines: lines }),
  setMotorLines: (lines) => set({ motorLines: lines }),
  queuePart: (itemId) => set({ pendingAdd: { type: 'part', itemId } }),
  queueMotor: (motorId, outcome = 'install') =>
    set({ pendingAdd: { type: 'motor', motorId, outcome } }),
  takePendingAdd: () => {
    const pending = get().pendingAdd;
    if (pending) set({ pendingAdd: null });
    return pending;
  },
  reset: () => set(initialState),
}));
