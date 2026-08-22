import { create } from 'zustand';

import { DEFAULT_HOME_TREND_PERIOD } from '../lib/period';
import type { HomePeriodId } from '../types';

type HomeTrendPeriodState = {
  period: HomePeriodId;
  setPeriod: (period: HomePeriodId) => void;
};

/**
 * The analytical window for the Trends section only.
 *
 * It is deliberately not a Home-wide range: Summary flows stay on their own
 * fixed week and say so on each row, so nothing on the screen silently re-cuts
 * itself when the reader widens a trend. It is also separate from
 * `useFinancePeriodStore` — Home answers "what needs me right now" and starts at
 * a week; Finance is a ledger narrative and starts at a month.
 */
export const useHomeTrendPeriodStore = create<HomeTrendPeriodState>((set) => ({
  period: DEFAULT_HOME_TREND_PERIOD,
  setPeriod: (period) => set({ period }),
}));
