import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { XIcon } from '@/assets/icons';
import { Button, Text } from '@/components/ui';
import { useSubscription } from '@/hooks/use-subscription';
import { usePaywall } from '@/hooks/use-paywall';
import { useSubscriptionSync } from '@/hooks/use-subscription-sync';
import { useTheme } from '@/hooks/use-theme';
import { featureRule, type GatedFeature } from '@/lib/subscriptions/feature-gate';
import type { PlanId } from '@/lib/subscriptions/types';
import { describeTrialOffer } from '@/lib/subscriptions/trial-policy';
// TEMPORARY: see lib/subscriptions/paywall-bypass.ts
import { setPaywallBypassed } from '@/lib/subscriptions/paywall-bypass';
import { haptics, radius, rhythm, spacing } from '@/theme';

import { paywallTimeline } from './animation/paywall-motion';
import { usePaywallEnter } from './animation/use-paywall-enter';
import { FeatureRow } from './components/feature-row';
import { PaywallFooter } from './components/paywall-footer';
import { PaywallHero } from './components/paywall-hero';
import { PlanCard } from './components/plan-card';
import { PurchaseCta } from './components/purchase-cta';
import { PurchaseStatusBanner } from './components/purchase-status-banner';
import { PRO_FEATURE_ROWS } from './data/pro-features';
import { DevSubscriptionPanel } from './components/dev-subscription-panel';
import { OfflineNotice } from './components/sync-indicator';
import { PlanCardSkeleton } from './components/subscription-skeletons';

type PaywallScreenProps = {
  /** Set when opened from a locked feature — personalizes the headline. */
  feature?: GatedFeature;
  /**
   * `modal` is the presented sheet with a close control.
   *
   * `gate` is the blocking screen shown to a user without a subscription. It
   * renders outside `RootNavigator`, so it must never navigate — hence the
   * explicit actions instead of a close button.
   */
  variant?: 'modal' | 'gate';
  onSignOut?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
};

const DEFAULT_SUBHEAD =
  'Everything your workspace needs to run without limits.';

/**
 * The paywall.
 *
 * Reads as one continuous column — mark, promise, value, price, action, legal —
 * with each block arriving on a short stagger. Prices, currency and trial terms
 * come from StoreKit; nothing about pricing is written into this file.
 */
export function PaywallScreen({
  feature,
  variant = 'modal',
  onSignOut,
  onRefresh,
  refreshing = false,
}: PaywallScreenProps) {
  const { colors } = useTheme();
  const { dismiss: routerDismiss } = usePaywall();
  const sync = useSubscriptionSync();
  const isGate = variant === 'gate';
  // In gate mode there is no navigator to pop, and the user is not permitted to
  // walk past this screen anyway.
  const dismiss = isGate ? () => undefined : routerDismiss;
  const {
    entitlement,
    offers,
    productsLoading,
    productsError,
    flow,
    trial,
    canManageBilling,
    purchase,
    restore,
    startTrial,
    reloadProducts,
    resetFlow,
  } = useSubscription();

  const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(null);

  // Clear any state left over from a previous visit so a stale error banner
  // never greets a fresh open.
  useEffect(() => {
    resetFlow();
    void reloadProducts();
  }, [reloadProducts, resetFlow]);

  // Default to the first plan the store actually priced.
  useEffect(() => {
    if (selectedPlan) return;
    const first = offers.find((offer) => offer.product !== null) ?? offers[0];
    if (first) setSelectedPlan(first.plan.id);
  }, [offers, selectedPlan]);

  // Dismiss shortly after success so the user lands back where they were. In
  // gate mode the entitlement change itself unmounts this screen.
  useEffect(() => {
    if (isGate) return;
    if (flow.phase !== 'success' && flow.phase !== 'restored') return;
    const timer = setTimeout(dismiss, 1600);
    return () => clearTimeout(timer);
  }, [dismiss, flow.phase, isGate]);

  const activeOffer = useMemo(
    () => offers.find((offer) => offer.plan.id === selectedPlan) ?? null,
    [offers, selectedPlan],
  );

  const trialLabel = describeTrialOffer(trial);
  const isTrialOffer = trial.kind !== 'none';

  const headline = feature ? featureRule(feature).paywall.title : undefined;
  const subhead = feature ? featureRule(feature).paywall.body : DEFAULT_SUBHEAD;

  /**
   * Yearly savings, computed only when both prices are known and share a
   * currency. Shown as a percentage rather than an amount so no money value is
   * ever formatted by hand.
   */
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

  const ctaLabel = isTrialOffer ? 'Start Free Trial' : 'Subscribe';

  const disclosure = useMemo(() => {
    // An internal trial is granted by our own server and does not auto-renew
    // into anything — stating Apple's renewal terms here would be false.
    if (trial.kind === 'internal') {
      return `${trial.days} days free. No payment now, and nothing renews automatically.`;
    }
    if (!activeOffer?.product) return 'Prices are shown in your local currency.';
    const period = activeOffer.plan.interval === 'yearly' ? 'year' : 'month';
    const base = `${activeOffer.product.displayPrice} per ${period}. Auto-renews until cancelled. Cancel anytime in your Apple ID settings.`;
    return trialLabel ? `${trialLabel}, then ${base}` : base;
  }, [activeOffer, trial, trialLabel]);

  const handlePurchase = useCallback(() => {
    if (!selectedPlan) return;
    haptics.medium();
    // An internal (non-Apple) trial is granted by our own server, not StoreKit.
    if (trial.kind === 'internal') {
      void startTrial();
      return;
    }
    void purchase(selectedPlan);
  }, [purchase, selectedPlan, startTrial, trial.kind]);

  const handleRestore = useCallback(() => {
    haptics.light();
    void restore();
  }, [restore]);

  const closeStyle = usePaywallEnter({ delay: 0, duration: 300, translateY: 0 });
  const featuresStyle = usePaywallEnter({ delay: paywallTimeline.featuresStart - 60 });
  const selectable = offers.length > 1;

  const ctaDisabled =
    !sync.isOnline ||
    !canManageBilling ||
    !selectedPlan ||
    (trial.kind !== 'internal' && !activeOffer?.product) ||
    flow.phase === 'loading' ||
    flow.phase === 'verifying' ||
    flow.phase === 'restoring';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'bottom']}>
      {isGate ? null : (
        <Animated.View
          style={[
            closeStyle,
            {
              flexDirection: 'row',
              justifyContent: 'flex-end',
              paddingHorizontal: rhythm.pad,
              paddingTop: spacing[2],
            },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            hitSlop={14}
            onPress={dismiss}
            style={{
              width: 32,
              height: 32,
              borderRadius: radius.full,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.muted,
            }}
          >
            <XIcon size="sm" color={colors.mutedForeground} />
          </Pressable>
        </Animated.View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: rhythm.pad,
          paddingTop: spacing[4],
          paddingBottom: spacing[10],
          gap: spacing[8],
        }}
      >
        <PaywallHero headline={headline} subhead={subhead} />

        <Animated.View style={[featuresStyle, { gap: spacing[4] }]}>
          {PRO_FEATURE_ROWS.map((row, index) => (
            <FeatureRow key={row.id} row={row} index={index} />
          ))}
        </Animated.View>

        <View style={{ gap: spacing[3] }}>
          <OfflineNotice />
          <PurchaseStatusBanner flow={flow} />

          {productsError ? (
            <Pressable onPress={() => void reloadProducts()} accessibilityRole="button">
              <Text variant="caption" color="muted" style={{ textAlign: 'center' }}>
                {productsError} Tap to retry.
              </Text>
            </Pressable>
          ) : null}

          {productsLoading && offers.every((offer) => offer.product === null)
            ? [0, 1].slice(0, Math.max(1, offers.length)).map((index) => (
                <PlanCardSkeleton key={`plan-skeleton-${index}`} index={index} />
              ))
            : null}

          {offers.map((offer, index) => (
            <PlanCard
              key={offer.plan.id}
              offer={offer}
              index={index}
              selected={offer.plan.id === selectedPlan}
              onSelect={setSelectedPlan}
              trialLabel={offer.plan.id === selectedPlan ? trialLabel : null}
              savingsLabel={savingsLabel(offer.plan.id)}
              selectable={selectable}
            />
          ))}

          {offers.length === 0 && !productsLoading ? (
            <Text variant="caption" color="muted" style={{ textAlign: 'center' }}>
              {Platform.OS === 'ios'
                ? 'Subscriptions are unavailable right now. Please try again later.'
                : 'Subscriptions are managed on iOS and the web.'}
            </Text>
          ) : null}
        </View>

        {entitlement.managedExternally ? (
          <ManagedElsewhereNotice />
        ) : (
          <>
            <PurchaseCta
              flow={flow}
              label={ctaLabel}
              disclosure={disclosure}
              disabled={ctaDisabled}
              onPress={handlePurchase}
            />

            {!canManageBilling ? (
              <Text variant="caption" color="muted" style={{ textAlign: 'center', lineHeight: 17 }}>
                Only the workspace owner can start a subscription. Ask them to upgrade.
              </Text>
            ) : null}
          </>
        )}

        <DevSubscriptionPanel />

        <PaywallFooter onRestore={handleRestore} restoring={flow.phase === 'restoring'} />

        {isGate ? (
          <View style={{ gap: spacing[2] }}>
            {onRefresh ? (
              <Button variant="secondary" loading={refreshing} onPress={onRefresh}>
                Refresh status
              </Button>
            ) : null}
            {onSignOut ? (
              <Button variant="ghost" onPress={onSignOut}>
                Sign out
              </Button>
            ) : null}

            {/* TEMPORARY: paywall escape hatch — remove together with
                lib/subscriptions/paywall-bypass.ts before launch. */}
            <Button
              variant="ghost"
              onPress={() => {
                haptics.light();
                setPaywallBypassed(true);
              }}
            >
              Continue without a subscription
            </Button>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * Shown when the workspace is already billed through Stripe or an Enterprise
 * contract. Purchasing again here would bill the company twice, so there is no
 * CTA — and on iOS, no link out either.
 */
function ManagedElsewhereNotice() {
  const { colors, tones } = useTheme();

  return (
    <View
      style={{
        padding: rhythm.cardPadX,
        borderRadius: radius['2xl'],
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
