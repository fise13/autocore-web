import { useState } from 'react';
import { View } from 'react-native';

import { Button, Text } from '@/components/ui';
import { useCompanySubscription, useSession } from '@/hooks';
import { useTheme } from '@/hooks/use-theme';
import {
  formatNextBillingDate,
  subscriptionHint,
  subscriptionPlanLabel,
} from '@/lib/billing/format-renewal';
import { canManageSettings } from '@/lib/permissions';
import { activateCompanyPro, refreshCompanyBilling, startCompanyTrial } from '@/services/api/billing';
import { haptics } from '@/theme';
import { toneBackground } from '@/theme/color-utils';

import { ProfileMetaCard, ProfileMetaRow } from '../components/profile-meta-card';
import { ProfileScreenShell } from '../components/profile-screen-shell';

const STATUS_LABELS: Record<string, string> = {
  active: 'Активна',
  trialing: 'Пробный период',
  past_due: 'Просрочена',
  canceled: 'Отменена',
  unpaid: 'Не оплачена',
  incomplete: 'Не завершена',
};

export function SubscriptionScreen() {
  const { colors } = useTheme();
  const { profile, companyId } = useSession();
  const { subscription, isPro, isLoading } = useCompanySubscription(companyId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const canManage = Boolean(profile?.isCompanyOwner || canManageSettings(profile));
  const plan = subscriptionPlanLabel(isPro);
  const billingStatus = subscription?.status ? STATUS_LABELS[subscription.status] ?? subscription.status : '—';
  const renewal = formatNextBillingDate(subscription?.currentPeriodEnd);

  const run = async (action: () => Promise<unknown>, message: string) => {
    if (!companyId) return;
    setBusy(true);
    setError(null);
    try {
      await action();
      setStatus(message);
      haptics.success();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Не удалось обновить подписку');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ProfileScreenShell title="Подписка" subtitle={subscriptionHint(subscription, isPro)}>
      <ProfileMetaCard title="Текущий план" delay={80}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 999,
              backgroundColor: isPro ? colors.primary : colors.muted,
            }}
          >
            <Text
              variant="caption"
              style={{ fontWeight: '700', color: isPro ? colors.primaryForeground : colors.foreground }}
            >
              {isLoading ? '…' : plan}
            </Text>
          </View>
          <Text variant="caption" color="muted">
            {isPro ? 'Все модули включены' : 'Базовые возможности'}
          </Text>
        </View>
        <ProfileMetaRow label="Статус" value={isLoading ? '…' : billingStatus} />
        {isPro ? <ProfileMetaRow label="Следующее списание" value={isLoading ? '…' : renewal} /> : null}
      </ProfileMetaCard>

      <ProfileMetaCard title="Возможности Pro" delay={120}>
        <View style={{ gap: 8 }}>
          {['Команда и роли', 'Расширенная аналитика', 'Все модули компании', 'Приглашения сотрудников'].map(
            (feature) => (
              <View
                key={feature}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 10,
                  backgroundColor: toneBackground(colors.primary, isPro ? 0.1 : 0.06),
                }}
              >
                <Text variant="caption" style={{ fontWeight: '600' }}>
                  {feature}
                </Text>
              </View>
            ),
          )}
        </View>
      </ProfileMetaCard>

      {canManage ? (
        <ProfileMetaCard delay={160}>
          {!isPro ? (
            <View style={{ gap: 10 }}>
              <Text variant="caption" color="muted" style={{ lineHeight: 18 }}>
                Подключите Pro прямо в приложении — команда и расширенные возможности откроются сразу.
              </Text>
              <Button loading={busy} onPress={() => void run(() => startCompanyTrial(companyId!), 'Пробный период активирован')}>
                Попробовать Pro
              </Button>
              <Button
                variant="secondary"
                loading={busy}
                onPress={() => void run(() => activateCompanyPro(companyId!), 'Подписка Pro активирована')}
              >
                Подключить Pro
              </Button>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              <Text variant="caption" color="muted" style={{ lineHeight: 18 }}>
                Подписка активна. Обновите статус, если недавно меняли тариф.
              </Text>
              <Button
                variant="secondary"
                loading={busy}
                onPress={() => void run(() => refreshCompanyBilling(companyId!), 'Статус подписки обновлён')}
              >
                Обновить статус
              </Button>
            </View>
          )}
        </ProfileMetaCard>
      ) : null}

      {status ? (
        <Text variant="caption" style={{ color: colors.success }}>
          {status}
        </Text>
      ) : null}
      {error ? (
        <Text variant="caption" style={{ color: colors.destructive }}>
          {error}
        </Text>
      ) : null}
    </ProfileScreenShell>
  );
}
