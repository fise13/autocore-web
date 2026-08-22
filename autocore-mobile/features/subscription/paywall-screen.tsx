import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { useSubscription } from '@/hooks/use-subscription';
import { usePaywall } from '@/hooks/use-paywall';
import { useTheme } from '@/hooks/use-theme';
import { featureRule, type GatedFeature } from '@/lib/subscriptions/feature-gate';
import { setPaywallBypassed } from '@/lib/subscriptions/paywall-bypass';
import { getPurchaseStoreSnapshot } from '@/lib/subscriptions/purchase-store';
import {
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
    canManageBilling,
    hasUnconfirmedPurchase,
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
    // Priming StoreKit's product cache is only useful before a tap, and doing
    // it mid-purchase is what makes OpenIAP emit QueryProduct errors onto the
    // purchase listener while Apple's sheet is open.
    if (flow.phase === 'loading' || flow.phase === 'verifying') return;
    void warmPlan(selectedPlan);
  }, [flow.phase, selectedPlan, warmPlan]);

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
  // Only a feature-seeded paywall gets a second sentence: there it explains
  // which locked thing the user just reached for. The default screen said the
  // headline again in different words.
  const subhead = feature ? featureRule(feature).paywall.body : null;

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
  const ctaReady = storeReady || storePrepared;

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
    void restore().then((outcome) => {
      if (outcome.kind !== 'conflict' || !outcome.canTransfer) return;
      // Moving a subscription revokes Pro from the workspace that holds it.
      // That is never something to do on the user's behalf.
      Alert.alert(
        'Subscription in use',
        `${outcome.message} Move it to this workspace? The other workspace loses Pro immediately.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Move it here',
            style: 'destructive',
            onPress: () => void restore({ transfer: true }),
          },
        ],
      );
    });
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
          unconfirmed={hasUnconfirmedPurchase}
          onContinue={handleContinue}
        />
      </SafeAreaView>
    );
  }

  // Everyone in the workspace hits this gate, but only an owner or admin can
  // buy. Showing them the CTA meant StoreKit charged their personal Apple ID
  // and the server then refused the receipt with a 403.
  const purchasable = canManageBilling && !entitlement.managedExternally;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'bottom']}>
      <PaywallChrome onSkip={handleSkip} onSignOut={isGate ? onSignOut : undefined} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: tokens.space.screenX,
          paddingTop: tokens.space.stack,
          paddingBottom: tokens.space.stack,
          gap: tokens.space.stack,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* The engine and the headline own the free space; the plan list sits
            directly above the dock rather than floating in the middle. */}
        <View style={{ flex: 1, justifyContent: 'center', paddingVertical: tokens.space.stack }}>
          <PaywallHero headline={headline} subhead={subhead} />
        </View>

        <View style={{ gap: tokens.space.inline }}>
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
                selectable={selectable}
                last={index === visibleOffers.length - 1}
              />
            ))}
          </PlanPicker>
        </View>

        {entitlement.managedExternally ? <ManagedElsewhereNotice /> : null}
        {!canManageBilling && !entitlement.managedExternally ? <AskOwnerNotice /> : null}
      </ScrollView>

      {!purchasable ? null : (
        <Animated.View
          style={[
            dockStyle,
            {
              paddingHorizontal: tokens.space.screenX,
              paddingTop: tokens.space.stack,
              paddingBottom: tokens.space.micro,
              gap: tokens.space.inline,
              backgroundColor: colors.background,
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
          <PaywallFooter disclosure={disclosure} />
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

/**
 * Shown to a member who cannot buy. A dead paywall with no explanation is the
 * worst version of this screen: the user taps Buy, Apple charges them, and the
 * server refuses the receipt because the workspace is not theirs to pay for.
 */
function AskOwnerNotice() {
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
        Ask an owner to subscribe
      </Text>
      <Text variant="caption" style={{ color: colors.mutedForeground, lineHeight: 18 }}>
        Only the workspace owner or an admin can buy AutoCore Pro. Once they do, Pro turns on for
        everyone here — no action needed on your side.
      </Text>
    </View>
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
