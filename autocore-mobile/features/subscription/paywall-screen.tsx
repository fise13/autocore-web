import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { useSubscription } from '@/hooks/use-subscription';
import { usePaywall } from '@/hooks/use-paywall';
import { useTheme } from '@/hooks/use-theme';
import { featureRule, type GatedFeature } from '@/lib/subscriptions/feature-gate';
import {
  formatIapPaywallStatus,
  isIapDebugEnabled,
  subscribeIapTrace,
} from '@/lib/subscriptions/iap-trace';
import { setPaywallBypassed } from '@/lib/subscriptions/paywall-bypass';
import { isConnected, isSubscriptionSkuWarmed } from '@/lib/subscriptions/purchase-manager';
import { getPurchaseStoreSnapshot } from '@/lib/subscriptions/purchase-store';
import {
  describeIntroOffer,
  describePaywallDisclosure,
  describeTrialCta,
  resolveTrialOffer,
} from '@/lib/subscriptions/trial-policy';
import type { PlanId } from '@/lib/subscriptions/types';
import { haptics, radius, rhythm, spacing, tokens } from '@/theme';

import { paywallTimeline } from './animation/paywall-motion';
import { usePaywallEnter } from './animation/use-paywall-enter';
import { PaywallChrome } from './components/paywall-chrome';
import { PaywallFooter } from './components/paywall-footer';
import { PaywallHero } from './components/paywall-hero';
import { PlanCard, PlanPicker } from './components/plan-card';
import { PurchaseCta } from './components/purchase-cta';
import { PurchaseStatusBanner } from './components/purchase-status-banner';
import { PurchaseSuccess } from './components/purchase-success';
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
    flow,
    purchase,
    reloadProducts,
    resetFlow,
    introEligible,
    restore,
    storePrepared,
    warmPlan,
  } = useSubscription();

  const offers = offersFromStore ?? [];

  const [selectedPlan, setSelectedPlan] = useState<PlanId>('pro_yearly');
  const startedTrialRef = useRef(false);

  useEffect(() => {
    if (offers.some((offer) => offer.plan.id === selectedPlan)) return;
    const first = offers[0];
    if (first) setSelectedPlan(first.plan.id);
  }, [offers, selectedPlan]);

  useEffect(() => {
    void warmPlan(selectedPlan);
  }, [selectedPlan, warmPlan]);

  useEffect(() => {
    const phase = getPurchaseStoreSnapshot().flow.phase;
    if (
      phase === 'success' ||
      phase === 'restored' ||
      phase === 'loading' ||
      phase === 'verifying' ||
      phase === 'pending'
    ) {
      return;
    }
    resetFlow();
    if (getPurchaseStoreSnapshot().products.length === 0) {
      void reloadProducts();
    }
  }, [reloadProducts, resetFlow]);

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

  const selectedOffer = offers.find((offer) => offer.plan.id === selectedPlan);
  const storeReady = Boolean(selectedOffer?.product);
  const selectedSku = selectedOffer?.product?.sku ?? selectedOffer?.plan.appleSku ?? null;
  const ctaReady = storeReady || storePrepared;
  const showIapDebug = isIapDebugEnabled();
  const iapDebugLine = useSyncExternalStore(
    subscribeIapTrace,
    () =>
      formatIapPaywallStatus({
        connected: isConnected(),
        storePrepared,
        sku: selectedSku,
        warmed: selectedSku ? isSubscriptionSkuWarmed(selectedSku) : false,
        flowPhase: flow.phase,
      }),
    () => '',
  );

  const trial = useMemo(
    () =>
      resolveTrialOffer({
        entitlement,
        product: selectedOffer?.product ?? null,
        introEligible,
      }),
    [entitlement, introEligible, selectedOffer?.product],
  );

  const ctaLabel = describeTrialCta(trial);
  const disclosure = describePaywallDisclosure(trial, selectedOffer?.product ?? null);

  const handlePurchase = useCallback(() => {
    haptics.medium();
    startedTrialRef.current = trial.kind === 'apple_intro' && trial.offer.isFreeTrial;
    void purchase(selectedPlan);
  }, [purchase, selectedPlan, trial]);

  const handleSkip = useCallback(() => {
    haptics.light();
    if (isGate) {
      setPaywallBypassed(true);
      return;
    }
    dismiss();
  }, [dismiss, isGate]);

  const handleRestore = useCallback(() => {
    haptics.light();
    startedTrialRef.current = false;
    void restore();
  }, [restore]);

  const handleContinue = useCallback(() => {
    haptics.medium();
    resetFlow();
    if (!isGate) dismiss();
  }, [dismiss, isGate, resetFlow]);

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
    !ctaReady ||
    flow.phase === 'loading' ||
    flow.phase === 'verifying' ||
    flow.phase === 'restoring';

  if (flow.phase === 'success' || flow.phase === 'restored') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'bottom']}>
        <PurchaseSuccess
          kind={flow.phase === 'restored' ? 'restored' : 'purchased'}
          startedTrial={startedTrialRef.current}
          onContinue={handleContinue}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'bottom']}>
      <PaywallChrome onSkip={handleSkip} onSignOut={isGate ? onSignOut : undefined} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: tokens.space.screenX,
          paddingTop: tokens.space.inline,
          paddingBottom: tokens.space.section,
          gap: tokens.space.section,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <PaywallHero headline={headline} subhead={subhead} />

        <View style={{ gap: tokens.space.stack, marginTop: 'auto' }}>
          <OfflineNotice />

          {productsError ? (
            <Pressable onPress={() => void reloadProducts()} accessibilityRole="button">
              <Text variant="caption" color="muted" style={{ textAlign: 'center' }}>
                {productsError} Tap to retry.
              </Text>
            </Pressable>
          ) : null}

          <PlanPicker>
            {visibleOffers.map((offer, index) => (
              <PlanCard
                key={offer.plan.id}
                offer={offer}
                index={index}
                selected={offer.plan.id === selectedPlan}
                onSelect={handleSelectPlan}
                savingsLabel={savingsLabel(offer.plan.id)}
                introLabel={
                  introEligible && offer.product?.introOffer
                    ? describeIntroOffer(offer.product.introOffer)
                    : null
                }
                selectable={selectable}
                last={index === visibleOffers.length - 1}
              />
            ))}
          </PlanPicker>
        </View>

        {entitlement.managedExternally ? <ManagedElsewhereNotice /> : null}
      </ScrollView>

      {entitlement.managedExternally ? null : (
        <Animated.View
          style={[
            dockStyle,
            {
              paddingHorizontal: tokens.space.screenX,
              paddingTop: tokens.space.stack,
              paddingBottom: tokens.space.micro,
              gap: tokens.space.stack,
              backgroundColor: colors.background,
              borderTopWidth: tokens.control.hairline,
              borderTopColor: colors.border,
            },
          ]}
        >
          <PurchaseStatusBanner flow={flow} />
          <PurchaseCta
            flow={flow}
            label={ctaLabel}
            startsTrial={trial.kind === 'apple_intro' && trial.offer.isFreeTrial}
            disabled={ctaDisabled}
            preparing={!ctaReady && !productsError}
            onPress={handlePurchase}
            restoring={flow.phase === 'restoring'}
            onRestore={handleRestore}
          />
          {showIapDebug ? (
            <Text variant="caption" color="muted" style={{ textAlign: 'center', lineHeight: 16 }}>
              {iapDebugLine}
            </Text>
          ) : null}
          <PaywallFooter disclosure={disclosure} />
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
