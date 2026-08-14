import { differenceInCalendarDays } from 'date-fns';

import type {
  FinanceHealth,
  FinanceHealthBand,
  FinanceSignal,
  FinanceTotals,
  FinanceWindow,
} from '../types';
import { formatCount, formatMoneyAdaptive, formatPercent, formatSignedPercent } from './format';
import { relativeChange } from './series';

/**
 * Financial health is a weighted read of five ledger-backed signals. It is not
 * a fitness ring: every input is a quantity the operator can look up, each
 * signal keeps its own readout, and a signal whose inputs are missing scores
 * nothing at all rather than defaulting to a flattering middle.
 */

/** Linear, clamped mapping from a measured value onto 0–100. */
function scoreBetween(value: number, atZero: number, atHundred: number): number {
  if (!Number.isFinite(value)) return 0;
  const ratio = (value - atZero) / (atHundred - atZero);
  return Math.round(Math.min(1, Math.max(0, ratio)) * 100);
}

export const HEALTH_WEIGHTS = {
  margin: 30,
  growth: 20,
  runway: 20,
  expense_control: 15,
  velocity: 10,
  inventory: 5,
} as const;

export type HealthInput = {
  window: FinanceWindow;
  totals: FinanceTotals;
  previousTotals: FinanceTotals;
  cashTotal: number;
};

export function windowDays(window: FinanceWindow): number {
  return Math.max(1, differenceInCalendarDays(window.to, window.from));
}

export function runwayDays(cashTotal: number, expense: number, days: number): number | null {
  if (expense <= 0) return null;
  const dailyBurn = expense / days;
  if (dailyBurn <= 0) return null;
  return Math.max(0, cashTotal) / dailyBurn;
}

function marginSignal(input: HealthInput): FinanceSignal {
  const { totals } = input;
  const available = totals.revenue > 0;
  return {
    id: 'margin',
    label: 'Profit margin',
    weight: HEALTH_WEIGHTS.margin,
    // −10% margin reads as failing, +30% as excellent for a parts/engine trade.
    score: available ? scoreBetween(totals.margin ?? 0, -0.1, 0.3) : null,
    readout: available ? formatPercent(totals.margin) : '—',
    meaning: 'Net profit as a share of everything you invoiced.',
    missing: available ? undefined : 'No revenue recorded in this period.',
  };
}

function growthSignal(input: HealthInput): FinanceSignal {
  const change = relativeChange(input.previousTotals.revenue, input.totals.revenue);
  return {
    id: 'growth',
    label: 'Revenue growth',
    weight: HEALTH_WEIGHTS.growth,
    score: change == null ? null : scoreBetween(change, -0.25, 0.25),
    readout: change == null ? '—' : formatSignedPercent(change),
    meaning: 'Revenue this period against the period before it.',
    missing: change == null ? 'The previous period has no revenue to compare against.' : undefined,
  };
}

function runwaySignal(input: HealthInput): FinanceSignal {
  const days = windowDays(input.window);
  const runway = runwayDays(input.cashTotal, input.totals.expense, days);
  const negative = input.cashTotal < 0;

  return {
    id: 'runway',
    label: 'Cash cover',
    weight: HEALTH_WEIGHTS.runway,
    // Three months of cover at the current burn is the top of the scale.
    score: runway == null ? null : negative ? 0 : scoreBetween(runway, 0, 90),
    readout:
      runway == null
        ? '—'
        : negative
          ? 'Negative balance'
          : `${Math.round(runway)} ${Math.round(runway) === 1 ? 'day' : 'days'}`,
    meaning: 'How long the cash on hand covers your average daily spend.',
    missing: runway == null ? 'No spend recorded, so there is no burn rate to divide by.' : undefined,
  };
}

function expenseControlSignal(input: HealthInput): FinanceSignal {
  const expenseChange = relativeChange(input.previousTotals.expense, input.totals.expense);
  const revenueChange = relativeChange(input.previousTotals.revenue, input.totals.revenue);
  const available = expenseChange != null && revenueChange != null;
  const gap = available ? expenseChange - revenueChange : 0;

  return {
    id: 'expense_control',
    label: 'Cost discipline',
    weight: HEALTH_WEIGHTS.expense_control,
    // Costs growing 25pp faster than revenue scores nothing; 25pp slower is full marks.
    score: available ? scoreBetween(gap, 0.25, -0.25) : null,
    readout: available
      ? `Costs ${formatSignedPercent(expenseChange)} · revenue ${formatSignedPercent(revenueChange)}`
      : '—',
    meaning: 'Whether costs are growing slower than the revenue that carries them.',
    missing: available
      ? undefined
      : 'The previous period lacks the costs or revenue needed for a baseline.',
  };
}

function velocitySignal(input: HealthInput): FinanceSignal {
  const change = relativeChange(input.previousTotals.salesCount, input.totals.salesCount);
  return {
    id: 'velocity',
    label: 'Sales velocity',
    weight: HEALTH_WEIGHTS.velocity,
    score: change == null ? null : scoreBetween(change, -0.5, 0.5),
    readout:
      change == null
        ? formatCount(input.totals.salesCount, 'sale')
        : `${formatCount(input.totals.salesCount, 'sale')} · ${formatSignedPercent(change)}`,
    meaning: 'How many income operations closed, against the period before.',
    missing: change == null ? 'The previous period recorded no sales to compare against.' : undefined,
  };
}

/**
 * Inventory efficiency is deliberately present and deliberately empty. The
 * ledger records what stock sold for, never what it is worth, so the signal
 * exists as an architecture slot and names the data it needs.
 */
function inventorySignal(): FinanceSignal {
  return {
    id: 'inventory',
    label: 'Inventory efficiency',
    weight: HEALTH_WEIGHTS.inventory,
    score: null,
    readout: 'Not connected',
    meaning: 'How fast stock value converts into revenue.',
    missing:
      'Engine and part records carry no cost value on mobile, so stock cannot be valued or turned into a turnover rate.',
  };
}

const BAND_LABELS: Record<FinanceHealthBand, string> = {
  at_risk: 'At risk',
  strained: 'Strained',
  stable: 'Stable',
  healthy: 'Healthy',
  strong: 'Strong',
};

export function healthBand(score: number): FinanceHealthBand {
  if (score < 35) return 'at_risk';
  if (score < 55) return 'strained';
  if (score < 70) return 'stable';
  if (score < 85) return 'healthy';
  return 'strong';
}

export function healthBandLabel(band: FinanceHealthBand | null): string {
  return band ? BAND_LABELS[band] : 'Not enough signal';
}

export function buildSignals(input: HealthInput): FinanceSignal[] {
  return [
    marginSignal(input),
    growthSignal(input),
    runwaySignal(input),
    expenseControlSignal(input),
    velocitySignal(input),
    inventorySignal(),
  ];
}

/**
 * Minimum weight that must be readable before an index is published.
 *
 * Margin and cash cover alone (50 of 100) can both max out in a company's very
 * first period and would print "100 · Strong" off two signals — a confident
 * number carrying almost no evidence. Below this floor the index withholds
 * itself and the detail view shows which signals are readable instead.
 */
export const MIN_SCORED_WEIGHT = 60;

export function scoredWeight(signals: FinanceSignal[]): number {
  return signals.reduce((sum, signal) => (signal.score == null ? sum : sum + signal.weight), 0);
}

export function scoreFromSignals(signals: FinanceSignal[]): number | null {
  let weighted = 0;
  let weight = 0;
  for (const signal of signals) {
    if (signal.score == null) continue;
    weighted += signal.score * signal.weight;
    weight += signal.weight;
  }
  if (weight < MIN_SCORED_WEIGHT) return null;
  return Math.round(weighted / weight);
}

export function buildHealth(input: HealthInput, previousScore: number | null): FinanceHealth {
  const signals = buildSignals(input);
  const score = scoreFromSignals(signals);
  const band = score == null ? null : healthBand(score);
  const available = signals.filter((signal) => signal.score != null).length;

  return {
    score,
    band,
    bandLabel: healthBandLabel(band),
    delta: score != null && previousScore != null ? score - previousScore : null,
    signals,
    availableCount: available,
    totalCount: signals.length,
  };
}

/** Why the index is withholding itself, in the reader's terms. */
export function healthUnavailableReason(health: FinanceHealth): string {
  if (health.availableCount === 0) {
    return 'Record income and costs and the index starts reading.';
  }
  return `Only ${health.availableCount} of ${health.totalCount} signals can be read — most of the rest need a full previous period to compare against.`;
}

/** Reader-facing summary of what the number is made of. */
export function healthCoverageLabel(health: FinanceHealth): string {
  return `Based on ${health.availableCount} of ${health.totalCount} signals`;
}

export function cashCoverageLabel(cashTotal: number, runway: number | null): string {
  if (runway == null) return formatMoneyAdaptive(cashTotal);
  return `${formatMoneyAdaptive(cashTotal)} · ${Math.round(runway)} days of cover`;
}
