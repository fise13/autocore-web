import { useState } from 'react';
import { Linking, View } from 'react-native';

import { Button, SettingsSectionCard, Text } from '@/components/ui';
import { useCompanySubscription, useSession } from '@/hooks';
import { useTheme } from '@/hooks/use-theme';
import { getWebAppUrl, WEB_SUBSCRIPTION_PATH } from '@/lib/app-web-url';
import {
  formatNextBillingDate,
  subscriptionHint,
  subscriptionPlanLabel,
} from '@/lib/billing/format-renewal';
import { refreshCompanyBilling } from '@/services/api/billing';
import { haptics, rhythm } from '@/theme';
import { toneBackground } from '@/theme/color-utils';

import { ProfileMetaRow } from '../components/profile-meta-card';
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
  const { companyId } = useSession();
  const { subscription, isPro, isLoading } = useCompanySubscription(companyId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const plan = subscriptionPlanLabel(isPro);
  const billingStatus = subscription?.status ? STATUS_LABELS[subscription.status] ?? subscription.status : '—';
  const renewal = formatNextBillingDate(subscription?.currentPeriodEnd);

  const openWebsite = () => {
    void Linking.openURL(getWebAppUrl(WEB_SUBSCRIPTION_PATH));
  };

  const refresh = async () => {
    if (!companyId) return;
    setBusy(true);
    setError(null);
    try {
      await refreshCompanyBilling(companyId);
      setStatus('Статус подписки обновлён');
      haptics.selection();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Не удалось обновить статус');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ProfileScreenShell title="Подписка" subtitle={subscriptionHint(subscription, isPro)}>
      <SettingsSectionCard title="Текущий план" description={isPro ? 'Все модули включены' : 'Требуется активная подписка'}>
        <View style={{ paddingHorizontal: rhythm.cardPadX, paddingBottom: rhythm.cardPadX, gap: rhythm.stack }}>
          <View
            style={{
              alignSelf: 'flex-start',
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: isPro ? toneBackground(colors.primary, 0.3) : colors.border,
              backgroundColor: isPro ? toneBackground(colors.primary, 0.08) : 'transparent',
            }}
          >
            <Text
              variant="caption"
              style={{ fontWeight: '600', color: isPro ? colors.primary : colors.mutedForeground }}
            >
              {isLoading ? '…' : plan}
            </Text>
          </View>
          <ProfileMetaRow label="Статус" value={isLoading ? '…' : billingStatus} />
          {isPro ? <ProfileMetaRow label="Следующее списание" value={isLoading ? '…' : renewal} /> : null}
        </View>
      </SettingsSectionCard>

      <SettingsSectionCard title="Возможности Pro">
        <View style={{ paddingHorizontal: rhythm.cardPadX, paddingBottom: rhythm.cardPadX, gap: 8 }}>
          {['Команда и роли', 'Расширенная аналитика', 'Все модули компании', 'Приглашения сотрудников'].map(
            (feature) => (
              <Text key={feature} variant="caption" color="muted">
                · {feature}
              </Text>
            ),
          )}
        </View>
      </SettingsSectionCard>

      <SettingsSectionCard
        title="Управление"
        description="Управление подпиской доступно на сайте. В приложении нет экранов оплаты."
      >
        <View style={{ paddingHorizontal: rhythm.cardPadX, paddingBottom: rhythm.cardPadX, gap: rhythm.stack }}>
          <Button onPress={openWebsite}>Открыть сайт</Button>
          <Button variant="secondary" loading={busy} onPress={() => void refresh()}>
            Обновить статус
          </Button>
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
        </View>
      </SettingsSectionCard>
    </ProfileScreenShell>
  );
}
