import { MobileApiError } from '@/services/api/mobile-client';

export function mapDocumentError(error: unknown, fallback = 'Не удалось выполнить операцию'): string {
  if (error instanceof MobileApiError) {
    if (error.status === 401) return 'Требуется повторный вход';
    if (error.status === 402) return 'Для документов нужна подписка Pro';
    if (error.status === 403) return 'Недостаточно прав для просмотра документов';
    if (error.status === 202) {
      return error.message || 'PDF формируется. Повторите через несколько секунд.';
    }
    return error.message || fallback;
  }

  if (!(error instanceof Error)) return fallback;

  const message = error.message;
  if (message.includes('PUPPETEER') || message.includes('Chrome не найден')) {
    return 'Не удалось сгенерировать PDF на сервере. Попробуйте позже.';
  }

  return message || fallback;
}
