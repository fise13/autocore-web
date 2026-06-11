"use client";

import { doc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import { useCallback, useEffect, useMemo, useState } from "react";

import { getFirestoreDb } from "@/infrastructure/firebase/client";
import { AppDisplayCurrency, normalizeAppDisplayCurrency } from "@/lib/money/display-currency";

export type AccountingPreferences = {
  syncEnabled: boolean;
  liveOverviewEnabled: boolean;
  employees: string[];
  specifics: string[];
  isConfigured: boolean;
  displayCurrency: AppDisplayCurrency;
};

const defaultAccountingPreferences: AccountingPreferences = {
  syncEnabled: true,
  liveOverviewEnabled: true,
  employees: [],
  specifics: [],
  isConfigured: false,
  displayCurrency: "KZT",
};

function mapPreferences(data: Record<string, unknown> | null | undefined): AccountingPreferences {
  const accountingSettings =
    typeof data?.accountingSettings === "object" && data?.accountingSettings !== null
      ? (data.accountingSettings as Record<string, unknown>)
      : null;

  const readStringArray = (value: unknown): string[] =>
    Array.isArray(value)
      ? value
          .map((item) => (typeof item === "string" ? item.trim() : ""))
          .filter((item) => item.length > 0)
      : [];

  return {
    syncEnabled:
      typeof data?.accountingSyncEnabled === "boolean"
        ? data.accountingSyncEnabled
        : defaultAccountingPreferences.syncEnabled,
    liveOverviewEnabled:
      typeof data?.accountingLiveOverviewEnabled === "boolean"
        ? data.accountingLiveOverviewEnabled
        : defaultAccountingPreferences.liveOverviewEnabled,
    employees: readStringArray(accountingSettings?.employees),
    specifics: readStringArray(accountingSettings?.specifics),
    isConfigured:
      typeof accountingSettings?.isConfigured === "boolean"
        ? accountingSettings.isConfigured
        : defaultAccountingPreferences.isConfigured,
    displayCurrency: normalizeAppDisplayCurrency(accountingSettings?.displayCurrency),
  };
}

export function useAccountingPreferences(uid: string) {
  const [preferences, setPreferences] = useState<AccountingPreferences>(defaultAccountingPreferences);

  const db = useMemo(() => getFirestoreDb(), []);

  useEffect(() => {
    if (!uid) return;
    const userRef = doc(db, "users", uid);
    const unsubscribe = onSnapshot(
      userRef,
      (snap) => {
        const data = snap.exists() ? (snap.data() as Record<string, unknown>) : null;
        setPreferences(mapPreferences(data));
      },
      () => undefined,
    );
    return () => unsubscribe();
  }, [db, uid]);

  const savePreferences = useCallback(
    async (next: Partial<AccountingPreferences>) => {
      if (!uid) return;
      const userRef = doc(db, "users", uid);
      const payload: Record<string, unknown> = {};
      if (typeof next.syncEnabled === "boolean") {
        payload.accountingSyncEnabled = next.syncEnabled;
      }
      if (typeof next.liveOverviewEnabled === "boolean") {
        payload.accountingLiveOverviewEnabled = next.liveOverviewEnabled;
      }
      if (
        next.employees !== undefined ||
        next.specifics !== undefined ||
        typeof next.isConfigured === "boolean" ||
        next.displayCurrency !== undefined
      ) {
        payload.accountingSettings = {
          employees: next.employees ?? preferences.employees,
          specifics: next.specifics ?? preferences.specifics,
          isConfigured: next.isConfigured ?? preferences.isConfigured,
          displayCurrency: next.displayCurrency ?? preferences.displayCurrency,
        };
      }
      await setDoc(userRef, payload, { merge: true });
    },
    [db, preferences.displayCurrency, preferences.employees, preferences.isConfigured, preferences.specifics, uid],
  );

  const updateAccountProfile = useCallback(
    async (payload: { name?: string | null; phone?: string | null }) => {
      if (!uid) return;
      const userRef = doc(db, "users", uid);
      await updateDoc(userRef, {
        ...(payload.name !== undefined ? { name: payload.name ?? "" } : {}),
        ...(payload.phone !== undefined ? { phone: payload.phone ?? "" } : {}),
      });
    },
    [db, uid],
  );

  return {
    preferences,
    isLoading: false,
    savePreferences,
    updateAccountProfile,
  };
}
