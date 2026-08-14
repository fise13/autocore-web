import { useMemo } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui';

import { fin, finType } from '../layout';
import { changeHeadline } from '../lib/drivers';
import { formatMoneyAdaptive } from '../lib/format';
import { formatWindowRange } from '../lib/period';
import { buildTrendMetrics, type FinanceTrendId } from '../lib/trends';
import type { FinanceFlowNodeId, FinanceModel, FinancePeriodId } from '../types';
import { FinActivity } from './fin-activity';
import { FinHealth } from './fin-health';
import { FinMoneyFlow } from './fin-money-flow';
import { FinPrimaryMetric } from './fin-primary-metric';
import { FinProfitability } from './fin-profitability';
import { FinSection } from './fin-primitives';
import { FinGaps } from './fin-states';
import { FinTrends } from './fin-trends';
import { FinWhatChanged } from './fin-what-changed';

export type FinanceOverviewHandlers = {
  onPeriodChange: (period: FinancePeriodId) => void;
  onOpenHealth: () => void;
  onOpenMetric: (id: FinanceTrendId) => void;
  onOpenFlow: (id: FinanceFlowNodeId) => void;
  onOpenLedger: () => void;
};

/**
 * The narrative, with no data binding of its own.
 *
 * Keeping the composition pure means the ordering and rhythm of the argument
 * can be reviewed and previewed against a fixture without a session, and the
 * screen that ships is the same component the review looked at.
 */
export function FinanceOverview({
  model,
  period,
  handlers,
}: {
  model: FinanceModel;
  period: FinancePeriodId;
  handlers: FinanceOverviewHandlers;
}) {
  const trends = useMemo(() => buildTrendMetrics(model), [model]);
  const range = formatWindowRange(model.window);

  return (
    <View style={{ gap: fin.chapter }}>
      <FinHealth
        health={model.health}
        comparisonLabel={model.window.period.comparisonLabel}
        onPress={handlers.onOpenHealth}
      />

      <FinPrimaryMetric
        model={model}
        period={period}
        onPeriodChange={handlers.onPeriodChange}
      />

      <FinSection title="Trends" caption={`Measured over ${range}`}>
        <FinTrends metrics={trends} onSelect={handlers.onOpenMetric} />
      </FinSection>

      <FinSection
        title="What changed"
        caption="Effect on profit of every category that moved, to the dollar"
      >
        <FinWhatChanged
          change={model.change}
          headline={changeHeadline(model.change, formatMoneyAdaptive)}
          comparisonLabel={model.window.period.comparisonLabel}
          onDriverPress={handlers.onOpenFlow}
        />
      </FinSection>

      <FinSection title="Money flow" caption="Where revenue came from and what it paid for">
        <FinMoneyFlow flow={model.flow} onNodePress={handlers.onOpenFlow} />
      </FinSection>

      <FinSection
        title="Profitability"
        caption="What each engine model and order actually returned"
      >
        <FinProfitability
          profitability={model.profitability}
          onShowLedger={handlers.onOpenLedger}
        />
      </FinSection>

      <FinSection
        title="Activity"
        caption={range}
        actionLabel="Ledger"
        onAction={handlers.onOpenLedger}
      >
        <FinActivity days={model.activity} />
      </FinSection>

      <View style={{ gap: fin.stack }}>
        <Text style={finType.label} color="muted">
          What Finance can’t see yet
        </Text>
        <FinGaps gaps={model.gaps} />
      </View>
    </View>
  );
}
