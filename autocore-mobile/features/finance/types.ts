import type { FinancialOperation } from '@/types/financial-operation';

/** ——— Period ——— */

export type FinancePeriodId = '7d' | '30d' | '3m' | '1y';

export type FinanceBucketGrain = 'day' | 'week' | 'month';

export type FinancePeriod = {
  id: FinancePeriodId;
  /** Switch label — 7D · 30D · 3M · 1Y */
  label: string;
  /** "Last 30 days" */
  longLabel: string;
  /** "vs previous 30 days" */
  comparisonLabel: string;
  grain: FinanceBucketGrain;
  buckets: number;
};

export type FinanceBucket = {
  start: Date;
  /** Exclusive */
  end: Date;
  /** Axis label — short */
  label: string;
  /** Scrub readout label — "Mon 14 Mar" */
  fullLabel: string;
};

export type FinanceWindow = {
  period: FinancePeriod;
  from: Date;
  /** Exclusive */
  to: Date;
  buckets: FinanceBucket[];
};

/** ——— Series ——— */

export type FinanceSeriesPoint = {
  bucket: FinanceBucket;
  revenue: number;
  expense: number;
  /** revenue − expense for this bucket alone */
  net: number;
  /** running net profit from the start of the window */
  cumulativeNet: number;
  /** operations that landed in this bucket */
  count: number;
};

export type FinanceTotals = {
  revenue: number;
  expense: number;
  net: number;
  /** net / revenue — null when there is no revenue to divide by */
  margin: number | null;
  /** count of income-side operations */
  salesCount: number;
  operationCount: number;
};

/** ——— Health ——— */

export type FinanceSignalId =
  | 'margin'
  | 'growth'
  | 'runway'
  | 'expense_control'
  | 'velocity'
  | 'inventory';

export type FinanceSignal = {
  id: FinanceSignalId;
  label: string;
  /** 0–100, or null when the inputs are not in the ledger */
  score: number | null;
  weight: number;
  /** The measured quantity, already formatted for display */
  readout: string;
  /** One line explaining what the signal reads */
  meaning: string;
  /** Present only when score is null — names the missing data source */
  missing?: string;
};

export type FinanceHealthBand = 'at_risk' | 'strained' | 'stable' | 'healthy' | 'strong';

export type FinanceHealth = {
  /** null when no signal could be computed */
  score: number | null;
  band: FinanceHealthBand | null;
  bandLabel: string;
  /** Point difference against the previous comparable window */
  delta: number | null;
  signals: FinanceSignal[];
  availableCount: number;
  totalCount: number;
};

/** ——— What changed ——— */

export type FinanceDriver = {
  id: string;
  label: string;
  /** Signed contribution to the net-profit delta, in base currency */
  contribution: number;
  current: number;
  previous: number;
  /** 'income' drivers move net up when they grow; 'cost' drivers move it down */
  kind: 'income' | 'cost';
};

export type FinanceChange = {
  /** net(current) − net(previous) */
  delta: number;
  current: number;
  previous: number;
  /** null when the previous window had no net to compare against */
  deltaPct: number | null;
  drivers: FinanceDriver[];
  /** True when the previous window holds no operations at all */
  noBaseline: boolean;
};

/** ——— Money flow ——— */

export type FinanceChannelId = 'engines' | 'work_orders' | 'parts' | 'other_income';

export type FinanceCostGroupId =
  | 'inventory'
  | 'parts_cost'
  | 'payroll'
  | 'logistics'
  | 'refunds'
  | 'other_cost';

export type FinanceFlowNodeId = FinanceChannelId | FinanceCostGroupId;

export type FinanceFlowNode = {
  id: FinanceFlowNodeId;
  label: string;
  amount: number;
  /** Share of its side's total, 0–1 */
  share: number;
  count: number;
  previous: number;
};

export type FinanceFlow = {
  revenue: number;
  cost: number;
  net: number;
  channels: FinanceFlowNode[];
  costs: FinanceFlowNode[];
};

/** ——— Profitability ——— */

export type FinanceEngineModel = {
  id: string;
  label: string;
  units: number;
  revenue: number;
  averagePrice: number;
  /** Share of engine revenue, 0–1 */
  share: number;
  previousRevenue: number;
  /** Gross profit — only when every sale in the group carries a cost basis */
  profit: number | null;
  margin: number | null;
  /** True when the model could not be read off the sale record */
  unattributed: boolean;
};

export type FinanceEngineProfitability = {
  models: FinanceEngineModel[];
  revenue: number;
  units: number;
  /** How many sales carry a recorded cost basis */
  withCostBasis: number;
  /** True when no engine sale in the window carries a cost basis */
  costUnavailable: boolean;
};

export type FinanceWorkOrderProfit = {
  id: string;
  label: string;
  client: string;
  revenue: number;
  partsCost: number;
  laborCost: number;
  cost: number;
  profit: number;
  margin: number | null;
  /** Labor cost is only known once payroll rows exist for the order */
  laborRecorded: boolean;
};

export type FinanceProfitability = {
  engines: FinanceEngineProfitability;
  workOrders: FinanceWorkOrderProfit[];
  workOrderRevenue: number;
  workOrderProfit: number;
};

/** ——— Activity ——— */

export type FinanceActivityEntry = {
  id: string;
  title: string;
  /** Entity this money moved through — engine, work order, client */
  context: string | null;
  amount: number;
  direction: 'in' | 'out';
  at: Date;
  time: string;
  channel: FinanceFlowNodeId;
  operation: FinancialOperation;
};

export type FinanceActivityDay = {
  key: string;
  label: string;
  entries: FinanceActivityEntry[];
  net: number;
};

/** ——— Model ——— */

export type FinanceAttention = {
  id: 'pending_payroll' | 'negative_cash';
  title: string;
  detail: string;
};

export type FinanceDataGap = {
  id: string;
  label: string;
  detail: string;
};

export type FinanceModel = {
  window: FinanceWindow;
  previousWindow: FinanceWindow;
  series: FinanceSeriesPoint[];
  totals: FinanceTotals;
  previousTotals: FinanceTotals;
  /** Signed growth of revenue / expense / net against the previous window */
  growth: {
    revenue: number | null;
    expense: number | null;
    net: number | null;
    margin: number | null;
  };
  cash: {
    total: number;
    cashbox: number;
    kaspi: number;
    /** Days of cover at the window's average daily spend */
    runwayDays: number | null;
  };
  health: FinanceHealth;
  change: FinanceChange;
  flow: FinanceFlow;
  profitability: FinanceProfitability;
  activity: FinanceActivityDay[];
  /** Money the ledger says is owed or short — actionable, not decorative */
  attention: FinanceAttention[];
  /** Metrics the ledger cannot answer yet, surfaced instead of guessed */
  gaps: FinanceDataGap[];
  hasData: boolean;
};
