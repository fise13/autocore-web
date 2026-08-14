import { create } from 'zustand';

import { DEFAULT_FINANCE_PERIOD } from '../lib/period';
import type { FinancePeriodId } from '../types';

type FinancePeriodState = {
  period: FinancePeriodId;
  setPeriod: (period: FinancePeriodId) => void;
};

/**
 * The window lives outside the screen so a drill-down opens on the same period
 * the reader was looking at — going deeper never silently changes the range.
 */
export const useFinancePeriodStore = create<FinancePeriodState>((set) => ({
  period: DEFAULT_FINANCE_PERIOD,
  setPeriod: (period) => set({ period }),
}));
