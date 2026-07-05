export function resolveGreeting(date = new Date()): string {
  const hour = date.getHours();

  if (hour >= 5 && hour < 12) return 'Доброе утро';
  if (hour >= 12 && hour < 18) return 'Добрый день';
  if (hour >= 18 && hour < 23) return 'Добрый вечер';
  return 'Доброй ночи';
}

/** First name for the MC header — not the company title. */
export function resolveProfileHeadline(displayName: string | null | undefined): string {
  const trimmed = displayName?.trim();
  if (!trimmed) return 'Профиль';
  const [firstName] = trimmed.split(/\s+/);
  return firstName || trimmed;
}
