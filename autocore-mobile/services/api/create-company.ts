import { getFirebaseAuth } from '@/services/firebase';
import { getPublicApiBaseUrl } from '@/services/api/api-base-url';

export async function createCompanyViaApi(name: string): Promise<string> {
  const user = getFirebaseAuth().currentUser;
  if (!user) {
    throw new Error('Требуется авторизация');
  }

  const token = await user.getIdToken();
  const response = await fetch(`${getPublicApiBaseUrl()}/api/onboarding/create-company`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ name: name.trim() }),
  });

  const payload = (await response.json().catch(() => null)) as {
    companyId?: string;
    error?: string;
  } | null;

  if (!response.ok) {
    throw new Error(payload?.error ?? 'Не удалось создать компанию');
  }

  const companyId = payload?.companyId?.trim();
  if (!companyId) {
    throw new Error('Сервер не вернул идентификатор компании');
  }

  return companyId;
}
