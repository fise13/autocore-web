import { doc, getDoc, setDoc } from 'firebase/firestore';

import { listenDocument } from '@/lib/firestore/trusted-snapshot';
import {
  normalizeAppDisplayCurrency,
  type AppDisplayCurrency,
} from '@/lib/money/display-currency';
import { getFirebaseDb } from '@/services/firebase';

export type AccountingSettings = {
  employees: string[];
  specifics: string[];
  isConfigured: boolean;
  displayCurrency: AppDisplayCurrency;
};

const DEFAULT_ACCOUNTING_SETTINGS: AccountingSettings = {
  employees: [],
  specifics: [],
  isConfigured: false,
  displayCurrency: 'USD',
};

function userRef(uid: string) {
  return doc(getFirebaseDb(), 'users', uid);
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => item.length > 0);
}

export function mapAccountingSettings(
  data: Record<string, unknown> | null | undefined,
): AccountingSettings {
  const accountingSettings =
    typeof data?.accountingSettings === 'object' && data.accountingSettings != null
      ? (data.accountingSettings as Record<string, unknown>)
      : null;

  return {
    employees: readStringArray(accountingSettings?.employees),
    specifics: readStringArray(accountingSettings?.specifics),
    isConfigured:
      typeof accountingSettings?.isConfigured === 'boolean'
        ? accountingSettings.isConfigured
        : DEFAULT_ACCOUNTING_SETTINGS.isConfigured,
    displayCurrency: normalizeAppDisplayCurrency(accountingSettings?.displayCurrency),
  };
}

/** Read-modify-write so nested currency / list saves never wipe sibling fields. */
async function patchAccountingSettings(
  uid: string,
  patch: Partial<AccountingSettings>,
): Promise<AccountingSettings> {
  const ref = userRef(uid);
  const snap = await getDoc(ref);
  const current = mapAccountingSettings(
    snap.exists() ? (snap.data() as Record<string, unknown>) : null,
  );
  const next: AccountingSettings = {
    employees: patch.employees ?? current.employees,
    specifics: patch.specifics ?? current.specifics,
    isConfigured: patch.isConfigured ?? current.isConfigured,
    displayCurrency: patch.displayCurrency
      ? normalizeAppDisplayCurrency(patch.displayCurrency)
      : current.displayCurrency,
  };
  await setDoc(ref, { accountingSettings: next }, { merge: true });
  return next;
}

export function subscribeUserDisplayCurrency(
  uid: string,
  onData: (currency: AppDisplayCurrency) => void,
  onError?: (error: Error) => void,
): () => void {
  return listenDocument(
    userRef(uid),
    (snapshot) => {
      const data = snapshot.data() as Record<string, unknown> | undefined;
      onData(mapAccountingSettings(data).displayCurrency);
    },
    onError,
  );
}

export async function saveUserDisplayCurrency(
  uid: string,
  displayCurrency: AppDisplayCurrency,
): Promise<void> {
  await patchAccountingSettings(uid, {
    displayCurrency: normalizeAppDisplayCurrency(displayCurrency),
  });
}

export function subscribeAccountingSettings(
  uid: string,
  onData: (settings: AccountingSettings) => void,
  onError?: (error: Error) => void,
): () => void {
  return listenDocument(
    userRef(uid),
    (snapshot) => {
      const data = snapshot.exists() ? (snapshot.data() as Record<string, unknown>) : null;
      onData(mapAccountingSettings(data));
    },
    onError,
  );
}

export async function saveAccountingLists(
  uid: string,
  lists: { employees: string[]; specifics: string[] },
): Promise<AccountingSettings> {
  return patchAccountingSettings(uid, {
    employees: lists.employees,
    specifics: lists.specifics,
    isConfigured: true,
  });
}
