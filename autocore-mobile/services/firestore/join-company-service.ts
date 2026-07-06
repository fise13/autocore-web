import {
  collection,
  getDocs,
  limit,
  query,
  where,
} from 'firebase/firestore';

import { acceptInvite } from '@/services/api/org-api';
import { getFirebaseDb } from '@/services/firebase';
import { mapAuthError } from '@/utils/auth-error';

function normalizeInviteCode(input: string): string {
  const map: Record<string, string> = {
    А: 'A',
    В: 'B',
    С: 'C',
    Е: 'E',
    Н: 'H',
    К: 'K',
    М: 'M',
    О: 'O',
    Р: 'P',
    Т: 'T',
    У: 'Y',
    Х: 'X',
    а: 'A',
    в: 'B',
    с: 'C',
    е: 'E',
    н: 'H',
    к: 'K',
    м: 'M',
    о: 'O',
    р: 'P',
    т: 'T',
    у: 'Y',
    х: 'X',
  };
  return input
    .trim()
    .toUpperCase()
    .split('')
    .map((char) => map[char] ?? char)
    .join('');
}

/**
 * Join company via invite code through the server API so team notifications
 * and activity logs are created consistently with web.
 */
export async function joinCompanyWithInviteCode(
  _uid: string,
  rawCode: string,
  switchToCompany = true,
): Promise<void> {
  const inviteCode = normalizeInviteCode(rawCode);
  if (!inviteCode) {
    throw new Error('Укажите код приглашения');
  }

  const snapshot = await getDocs(
    query(collection(getFirebaseDb(), 'invites'), where('code', '==', inviteCode), limit(1)),
  );
  if (snapshot.empty) {
    throw new Error('Код приглашения не найден. Проверьте правильность кода и попробуйте снова.');
  }

  const invite = snapshot.docs[0]!.data();
  const token = typeof invite.token === 'string' ? invite.token.trim() : '';
  if (!token) {
    throw new Error('Приглашение повреждено. Попросите администратора отправить новое.');
  }

  try {
    await acceptInvite(token, switchToCompany);
  } catch (error) {
    throw new Error(mapAuthError(error));
  }
}
