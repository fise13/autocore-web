import { Children, type ReactNode } from 'react';
import { View } from 'react-native';

import { Badge, CollectionRow, ListSection, Text } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import {
  formatRenewalDate,
  periodEndLabel,
  planLabel,
  renewalLine,
} from '@/lib/subscriptions/format';
import { presentEntitlement, TONE_BADGE_VARIANT } from '@/lib/subscriptions/status-presentation';
import type { Entitlement } from '@/lib/subscriptions/types';
import { tokens } from '@/theme';

import { SyncIndicator } from './sync-indicator';
import { TrialCountdown } from './trial-countdown';

type SubscriptionPlanSectionProps = {
  entitlement: Entitlement;
  title?: string;
  footer?: string;
  children?: ReactNode;
};

const ROW_PAD_X = tokens.space.stack + 2;

/**
 * Workspace plan, as a settings island.
 *
 * Same chrome as Modules / Team: sentence-case section label, card fill, no
 * glyph well. Status lives in the header; billing date and actions are rows.
 */
export function SubscriptionPlanSection({
  entitlement,
  title = 'Subscription',
  footer,
  children,
}: SubscriptionPlanSectionProps) {
  const periodEnd = entitlement.isTrial ? entitlement.trialEndsAt : entitlement.renewsAt;
  const hasRows = Boolean(periodEnd) || Children.toArray(children).some(Boolean);

  return (
    <ListSection title={title} footer={footer}>
      <PlanHeader entitlement={entitlement} compactFooter={!hasRows} />
      {periodEnd ? (
        <CollectionRow
          title={periodEndLabel(entitlement)}
          value={formatRenewalDate(periodEnd)}
          showChevron={false}
        />
      ) : null}
      {children}
    </ListSection>
  );
}

function PlanHeader({
  entitlement,
  compactFooter,
}: {
  entitlement: Entitlement;
  compactFooter: boolean;
}) {
  const { colors } = useTheme();
  const line = renewalLine(entitlement);
  const presentation = presentEntitlement(entitlement, line);
  const showCountdown = entitlement.isTrial && entitlement.trialEndsAt !== null;

  return (
    <View
      accessible
      accessibilityRole="summary"
      accessibilityLabel={`${planLabel(entitlement)}, ${presentation.label}. ${presentation.detail}`}
      style={{
        paddingHorizontal: ROW_PAD_X,
        paddingTop: 14,
        paddingBottom: compactFooter ? 14 : 12,
        gap: tokens.space.inline,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.space.inline }}>
        <Text
          variant="body"
          numberOfLines={1}
          style={{
            flex: 1,
            fontSize: 16,
            lineHeight: 21,
            fontWeight: '600',
            letterSpacing: -0.24,
            color: colors.foreground,
          }}
        >
          {planLabel(entitlement)}
        </Text>
        <Badge variant={TONE_BADGE_VARIANT[presentation.tone]} icon={presentation.icon}>
          {presentation.label}
        </Badge>
      </View>

      <Text
        variant="footnote"
        color="muted"
        style={{ fontSize: 13, lineHeight: 17, letterSpacing: -0.08 }}
      >
        {presentation.detail}
      </Text>

      {showCountdown && entitlement.trialEndsAt ? (
        <View style={{ paddingTop: tokens.space.micro }}>
          <TrialCountdown endsAt={entitlement.trialEndsAt} />
        </View>
      ) : null}

      <SyncIndicator />
    </View>
  );
}
