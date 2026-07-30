import { useState } from 'react';
import { Linking, View } from 'react-native';

import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  CheckIcon,
  ClockIcon,
  SparklesIcon,
  XIcon,
} from '@/assets/icons';
import type { IconProps } from '@/assets/icons';
import { Badge, Button, SettingsSectionCard, Text } from '@/components/ui';
import { useCompanySubscription, useSession } from '@/hooks';
import { useTheme } from '@/hooks/use-theme';
import { getWebAppUrl, WEB_SUBSCRIPTION_PATH } from '@/lib/app-web-url';
import { formatNextBillingDate, subscriptionPlanLabel } from '@/lib/billing/format-renewal';
import { refreshCompanyBilling } from '@/services/api/billing';
import { haptics, radius, rhythm, spacing, type ToneName } from '@/theme';
import type { BillingStatus } from '@/types/billing';

import { ProfileScreenShell } from '../components/profile-screen-shell';

type StatusPresentation = {
  label: string;
  tone: ToneName;
  icon: React.ComponentType<IconProps>;
};

/**
 * Status carries its own colour and glyph so it reads at a glance, rather than
 * arriving as the right-hand half of a "Status: …" label/value pair.
 */
const STATUS_PRESENTATION: Record<BillingStatus, StatusPresentation> = {
  active: { label: 'Active', tone: 'success', icon: CheckCircle2Icon },
  trialing: { label: 'Trial', tone: 'primary', icon: ClockIcon },
  past_due: { label: 'Past due', tone: 'warning', icon: AlertTriangleIcon },
  unpaid: { label: 'Unpaid', tone: 'danger', icon: AlertTriangleIcon },
  canceled: { label: 'Canceled', tone: 'muted', icon: XIcon },
  incomplete: { label: 'Incomplete', tone: 'warning', icon: ClockIcon },
};

const BADGE_VARIANT: Record<
  ToneName,
  'default' | 'success' | 'warning' | 'destructive' | 'secondary'
> = {
  primary: 'default',
  success: 'success',
  warning: 'warning',
  danger: 'destructive',
  muted: 'secondary',
  default: 'secondary',
};

const PRO_FEATURES = [
  'Team and roles',
  'Advanced analytics',
  'All company modules',
  'Employee invitations',
];

export function SubscriptionScreen() {
  const { colors, tones } = useTheme();
  const { companyId } = useSession();
  const { subscription, isPro, isLoading } = useCompanySubscription(companyId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const plan = subscriptionPlanLabel(isPro);
  const presentation = subscription?.status
    ? STATUS_PRESENTATION[subscription.status as BillingStatus]
    : null;
  const planTone: ToneName = isPro ? 'primary' : 'muted';

  const renewalLine = (() => {
    if (isLoading) return '…';
    if (!isPro) return 'Basic features';
    if (!subscription?.currentPeriodEnd) return 'Subscription active';
    const date = formatNextBillingDate(subscription.currentPeriodEnd);
    return subscription.status === 'trialing'
      ? `Trial ends ${date}`
      : `Next billing date ${date}`;
  })();

  const openWebsite = () => {
    void Linking.openURL(getWebAppUrl(WEB_SUBSCRIPTION_PATH));
  };

  const refresh = async () => {
    if (!companyId) return;
    setBusy(true);
    setError(null);
    try {
      await refreshCompanyBilling(companyId);
      setStatus('Subscription status updated');
      haptics.selection();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to update status');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ProfileScreenShell title="Subscription">
      {/* Plan, status and renewal read as one unit instead of three meta rows. */}
      <SettingsSectionCard>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing[3],
            padding: rhythm.cardPadX,
          }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: radius.xl,
              backgroundColor: tones[planTone].bg,
              borderWidth: 1,
              borderColor: tones[planTone].border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SparklesIcon size="md" color={tones[planTone].fg} />
          </View>

          <View style={{ flex: 1, gap: spacing[0.5] }}>
            <Text variant="title">{isLoading ? '…' : plan}</Text>
            <Text variant="caption" color="muted">
              {renewalLine}
            </Text>
          </View>

          {presentation ? (
            <Badge variant={BADGE_VARIANT[presentation.tone]} icon={presentation.icon}>
              {presentation.label}
            </Badge>
          ) : null}
        </View>
      </SettingsSectionCard>

      <SettingsSectionCard
        title="Pro features"
        description={isPro ? 'All modules included' : 'Available after subscribing'}
      >
        <View
          style={{
            paddingHorizontal: rhythm.cardPadX,
            paddingBottom: rhythm.cardPadX,
            gap: spacing[2],
          }}
        >
          {PRO_FEATURES.map((feature) => (
            <View
              key={feature}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}
            >
              <View
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: radius.full,
                  backgroundColor: isPro ? tones.success.bg : colors.muted,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CheckIcon size="xs" color={isPro ? tones.success.fg : colors.mutedForeground} />
              </View>
              <Text variant="body" color={isPro ? 'primary' : 'muted'}>
                {feature}
              </Text>
            </View>
          ))}
        </View>
      </SettingsSectionCard>

      <SettingsSectionCard
        title="Manage"
        description="Manage your subscription on the website. The app has no payment screens."
      >
        <View
          style={{
            paddingHorizontal: rhythm.cardPadX,
            paddingBottom: rhythm.cardPadX,
            gap: rhythm.stack,
          }}
        >
          <Button onPress={openWebsite}>Open website</Button>
          <Button variant="secondary" loading={busy} onPress={() => void refresh()}>
            Refresh status
          </Button>
          {status ? (
            <Text variant="caption" style={{ color: tones.success.fg }}>
              {status}
            </Text>
          ) : null}
          {error ? (
            <Text variant="caption" style={{ color: tones.danger.fg }}>
              {error}
            </Text>
          ) : null}
        </View>
      </SettingsSectionCard>
    </ProfileScreenShell>
  );
}
