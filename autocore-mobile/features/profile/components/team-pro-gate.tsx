import { useState } from 'react';
import { View } from 'react-native';

import { Button, Text } from '@/components/ui';
import { useCompanySubscription, useSession } from '@/hooks';
import { activateCompanyPro, startCompanyTrial } from '@/services/api/billing';
import { canManageSettings } from '@/lib/permissions';
import { subscriptionPlanLabel } from '@/lib/billing/format-renewal';
import { haptics } from '@/theme';

import { ProfileMetaCard } from './profile-meta-card';

type TeamProGateProps = {
  children: React.ReactNode;
};

export function TeamProGate({ children }: TeamProGateProps) {
  const { profile, companyId } = useSession();
  const { isPro, isLoading } = useCompanySubscription(companyId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const canManage = Boolean(profile?.isCompanyOwner || canManageSettings(profile));

  const runBilling = async (action: () => Promise<unknown>, success: string) => {
    if (!companyId) return;
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      await action();
      setStatus(success);
      haptics.success();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Не удалось обновить подписку');
      haptics.warning();
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) {
    return (
      <ProfileMetaCard delay={80}>
        <Text variant="caption" color="muted">
          Проверяем подписку…
        </Text>
      </ProfileMetaCard>
    );
  }

  if (isPro) {
    return <>{children}</>;
  }

  return (
    <ProfileMetaCard title="Команда на Pro" delay={80}>
      <Text variant="caption" color="muted" style={{ lineHeight: 18 }}>
        Сотрудники, роли и коды приглашений доступны на тарифе {subscriptionPlanLabel(true)}.
      </Text>
      {canManage ? (
        <View style={{ gap: 8 }}>
          <Button
            loading={busy}
            onPress={() => void runBilling(() => startCompanyTrial(companyId!), 'Пробный период активирован')}
          >
            Попробовать Pro
          </Button>
          <Button
            variant="secondary"
            loading={busy}
            onPress={() => void runBilling(() => activateCompanyPro(companyId!), 'Подписка Pro активирована')}
          >
            Подключить Pro
          </Button>
        </View>
      ) : (
        <Text variant="caption" color="muted" style={{ lineHeight: 18 }}>
          Попросите владельца компании подключить тариф Pro.
        </Text>
      )}
      {status ? (
        <Text variant="caption" style={{ color: '#16a34a' }}>
          {status}
        </Text>
      ) : null}
      {error ? (
        <Text variant="caption" style={{ color: '#ef4444' }}>
          {error}
        </Text>
      ) : null}
    </ProfileMetaCard>
  );
}
