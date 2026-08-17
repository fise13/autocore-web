import { useCallback, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { useSubscription } from '@/hooks/use-subscription';
import { usePaywall } from '@/hooks/use-paywall';
import { useTheme } from '@/hooks/use-theme';
import { featureRule, type GatedFeature } from '@/lib/subscriptions/feature-gate';
import type { PlanId } from '@/lib/subscriptions/types';
import { setPaywallBypassed } from '@/lib/subscriptions/paywall-bypass';
import { haptics, radius, rhythm, spacing } from '@/theme';

import { paywallTimeline } from './animation/paywall-motion';
import { usePaywallEnter } from './animation/use-paywall-enter';
import { PaywallChrome } from './components/paywall-chrome';
import { PaywallFooter } from './components/paywall-footer';
import { PaywallHero } from './components/paywall-hero';
import { PlanCard } from './components/plan-card';
import { PurchaseCta } from './components/purchase-cta';
import { PurchaseStatusBanner } from './components/purchase-status-banner';
import { OfflineNotice } from './components/sync-indicator';

type PaywallScreenProps = {
  feature?: GatedFeature;
  variant?: 'modal' | 'gate';
  onSignOut?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
};

const DEFAULT_HEADLINE = 'Your entire operation.\nOne workspace.';
const DEFAULT_SUBHEAD = 'Inventory, work orders, AI and reports, all in one workspace.';

export function PaywallScreen({
  feature,
  variant = 'modal',
  onSignOut,
}: PaywallScreenProps) {
  const { colors } = useTheme();
  const { dismiss: routerDismiss } = usePaywall();
  const isGate = variant === 'gate';
  const dismiss = isGate ? () => undefined : routerDismiss;
  const {
    entitlement,
    offers: offersFromStore,
    productsError,
    productsLoading,
    flow,
    purchase,
    reloadProducts,
    resetFlow,
  } = useSubscription();

  const offers = offersFromStore ?? [];

  const [selectedPlan, setSelectedPlan] = useState<PlanId>('pro_yearly');

  useEffect(() => {
    resetFlow();
    void reloadProducts();
  }, [reloadProducts, resetFlow]);

  useEffect(() => {
    if (isGate) return;
    if (flow.phase !== 'success' && flow.phase !== 'restored') return;
    const timer = setTimeout(dismiss, 1400);
    return () => clearTimeout(timer);
  }, [dismiss, flow.phase, isGate]);

  const headline = feature ? featureRule(feature).paywall.title : DEFAULT_HEADLINE;
  const subhead = feature ? featureRule(feature).paywall.body : DEFAULT_SUBHEAD;

  const savingsLabel = useCallback(
    (planId: PlanId): string | null => {
      if (planId !== 'pro_yearly') return null;
      const yearly = offers.find((offer) => offer.plan.id === 'pro_yearly')?.product;
      const monthly = offers.find((offer) => offer.plan.id === 'pro_monthly')?.product;
      if (!yearly?.priceAmount || !monthly?.priceAmount) return null;
      if (yearly.currency !== monthly.currency) return null;

      const yearlyAtMonthlyRate = monthly.priceAmount * 12;
      if (yearlyAtMonthlyRate <= yearly.priceAmount) return null;

      const percent = Math.round((1 - yearly.priceAmount / yearlyAtMonthlyRate) * 100);
      return percent >= 5 ? `Save ${percent}%` : null;
    },
    [offers],
  );

  const ctaLabel = 'Continue with Pro';

  const disclosure =
    'Payment is charged to your Apple ID. The subscription renews automatically unless cancelled at least 24 hours before the current period ends.';

  const selectedOffer = offers.find((offer) => offer.plan.id === selectedPlan);
  const storeReady = Boolean(selectedOffer?.product);

  const handlePurchase = useCallback(() => {
    const planId = selectedPlan ?? 'pro_monthly';
    haptics.medium();
    void purchase(planId);
  }, [purchase, selectedPlan]);

  const handleSelectPlan = useCallback(
    (planId: PlanId) => {
      if (flow.phase === 'failed' || flow.phase === 'cancelled' || flow.phase === 'restore_empty') {
        resetFlow();
      }
      setSelectedPlan(planId);
    },
    [flow.phase, resetFlow],
  );

  const dockStyle = usePaywallEnter({ delay: paywallTimeline.cta, translateY: 20 });
  const visibleOffers = offers;
  const selectable = visibleOffers.length > 1;

  const ctaDisabled =
    !storeReady ||
    productsLoading ||
    flow.phase === 'loading' ||
    flow.phase === 'verifying' ||
    flow.phase === 'restoring';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'bottom']}>
      <PaywallChrome showClose={!isGate} onClose={dismiss} onSignOut={isGate ? onSignOut : undefined} />

      <View
        style={{
          flex: 1,
          paddingHorizontal: rhythm.pad,
          paddingTop: spacing[2],
          gap: spacing[3],
        }}
      >
        <PaywallHero headline={headline} subhead={subhead} />

        <View style={{ gap: spacing[2], flex: 1, justifyContent: 'flex-end' }}>
          <OfflineNotice />

          {productsError ? (
            <Pressable onPress={() => void reloadProducts()} accessibilityRole="button">
              <Text variant="caption" color="muted" style={{ textAlign: 'center' }}>
                {productsError} Tap to retry.
              </Text>
            </Pressable>
          ) : null}

          <View style={{ gap: spacing[2] }}>
            {visibleOffers.map((offer, index) => (
              <PlanCard
                key={offer.plan.id}
                offer={offer}
                index={index}
                selected={offer.plan.id === selectedPlan}
                onSelect={handleSelectPlan}
                savingsLabel={savingsLabel(offer.plan.id)}
                selectable={selectable}
              />
            ))}
          </View>
        </View>

        {entitlement.managedExternally ? <ManagedElsewhereNotice /> : null}
      </View>

      {entitlement.managedExternally ? null : (
        <Animated.View
          style={[
            dockStyle,
            {
              paddingHorizontal: rhythm.pad,
              paddingTop: spacing[3],
              paddingBottom: spacing[1],
              gap: spacing[2],
              backgroundColor: colors.background,
            },
          ]}
        >
          <View style={{ minHeight: 36, justifyContent: 'center' }}>
            <PurchaseStatusBanner flow={flow} />
          </View>
          <PurchaseCta
            flow={flow}
            label={ctaLabel}
            disclosure={disclosure}
            disabled={ctaDisabled}
            onPress={handlePurchase}
          />
          {isGate ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Continue without a subscription"
              onPress={() => {
                haptics.light();
                setPaywallBypassed(true);
              }}
              hitSlop={8}
              style={{ minHeight: 44, justifyContent: 'center', alignItems: 'center' }}
            >
              <Text variant="caption" color="muted" style={{ fontWeight: '600' }}>
                Continue without a subscription
              </Text>
            </Pressable>
          ) : null}
          <PaywallFooter />
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

function ManagedElsewhereNotice() {
  const { colors, tones } = useTheme();

  return (
    <View
      style={{
        padding: rhythm.cardPadX,
        borderRadius: radius.xl,
        backgroundColor: tones.primary.bg,
        borderWidth: 1,
        borderColor: tones.primary.border,
        gap: spacing[1.5],
      }}
    >
      <Text variant="body" style={{ color: tones.primary.fg, fontWeight: '600' }}>
        Managed outside the App Store
      </Text>
      <Text variant="caption" style={{ color: colors.mutedForeground, lineHeight: 18 }}>
        This workspace already has a subscription billed elsewhere. Changes to it are handled by
        whoever set it up.
      </Text>
    </View>
  );
}
