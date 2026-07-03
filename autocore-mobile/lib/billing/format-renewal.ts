export function formatNextBillingDate(date: Date | null | undefined): string {
  if (!date) return '—';
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function subscriptionPlanLabel(isPro: boolean): string {
  return isPro ? 'Pro' : 'Бесплатный';
}

export function subscriptionHint(
  subscription: {
    status: string;
    currentPeriodEnd?: Date | null;
  } | null,
  isPro: boolean,
): string {
  if (!isPro) return 'Базовые возможности';
  if (subscription?.status === 'trialing' && subscription.currentPeriodEnd) {
    return `Пробный период до ${formatNextBillingDate(subscription.currentPeriodEnd)}`;
  }
  if (subscription?.currentPeriodEnd) {
    return `Следующее списание ${formatNextBillingDate(subscription.currentPeriodEnd)}`;
  }
  return 'Подписка активна';
}
