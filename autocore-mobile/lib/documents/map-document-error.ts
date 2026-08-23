import { MobileApiError } from '@/services/api/mobile-client';

export function mapDocumentError(error: unknown, fallback = 'Could not complete the operation'): string {
  if (error instanceof MobileApiError) {
    if (error.status === 401) return 'Please sign in again';
    if (error.status === 402) return 'Documents require a Pro subscription';
    if (error.status === 403) return 'You do not have permission to view documents';
    if (error.status === 202) {
      return error.message || 'The PDF is being generated. Try again in a few seconds.';
    }
    return error.message || fallback;
  }

  if (!(error instanceof Error)) return fallback;

  const message = error.message;
  if (message.includes('PUPPETEER') || message.includes('Chrome was not found')) {
    return 'Could not generate the PDF on the server. Please try again later.';
  }

  return message || fallback;
}
