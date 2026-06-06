"use client";

import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { useCallback, useEffect, useMemo, useState } from "react";

import { getFirestoreDb } from "@/infrastructure/firebase/client";
import { updateAccountProfile as updateAccountProfileRemote } from "@/infrastructure/firestore/user-profile-service";
import { AccountingPreferences } from "@/hooks/use-accounting-preferences";

export type WorkflowPreferences = {
  defaultAvailability: "all" | "available" | "sold";
  autoSwitchToSold: boolean;
  rememberBrand: boolean;
  rememberEngine: boolean;
};

export type ImportExportPreferences = {
  conflictBehavior: "keepLocal" | "preferCloud";
  exportDateFormat: "dd.MM.yyyy" | "yyyy-MM-dd";
  includeSold: boolean;
  includeDeleted: boolean;
};

export type UserPreferences = AccountingPreferences & {
  motorSyncEnabled: boolean;
  workflow: WorkflowPreferences;
  importExport: ImportExportPreferences;
};

const defaultWorkflow: WorkflowPreferences = {
  defaultAvailability: "all",
  autoSwitchToSold: true,
  rememberBrand: true,
  rememberEngine: true,
};

const defaultImportExport: ImportExportPreferences = {
  conflictBehavior: "keepLocal",
  exportDateFormat: "dd.MM.yyyy",
  includeSold: true,
  includeDeleted: false,
};

const defaultUserPreferences: UserPreferences = {
  syncEnabled: true,
  liveOverviewEnabled: true,
  employees: [],
  specifics: [],
  isConfigured: false,
  motorSyncEnabled: true,
  workflow: defaultWorkflow,
  importExport: defaultImportExport,
};

function mapPreferences(data: Record<string, unknown> | null | undefined): UserPreferences {
  const accountingSettings =
    typeof data?.accountingSettings === "object" && data?.accountingSettings !== null
      ? (data.accountingSettings as Record<string, unknown>)
      : null;
  const workflowSettings =
    typeof data?.workflowSettings === "object" && data?.workflowSettings !== null
      ? (data.workflowSettings as Record<string, unknown>)
      : null;
  const importExportSettings =
    typeof data?.importExportSettings === "object" && data?.importExportSettings !== null
      ? (data.importExportSettings as Record<string, unknown>)
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
        : defaultUserPreferences.syncEnabled,
    liveOverviewEnabled:
      typeof data?.accountingLiveOverviewEnabled === "boolean"
        ? data.accountingLiveOverviewEnabled
        : defaultUserPreferences.liveOverviewEnabled,
    employees: readStringArray(accountingSettings?.employees),
    specifics: readStringArray(accountingSettings?.specifics),
    isConfigured:
      typeof accountingSettings?.isConfigured === "boolean"
        ? accountingSettings.isConfigured
        : defaultUserPreferences.isConfigured,
    motorSyncEnabled:
      typeof data?.motorSyncEnabled === "boolean"
        ? data.motorSyncEnabled
        : defaultUserPreferences.motorSyncEnabled,
    workflow: {
      defaultAvailability:
        workflowSettings?.defaultAvailability === "available" ||
        workflowSettings?.defaultAvailability === "sold"
          ? workflowSettings.defaultAvailability
          : defaultWorkflow.defaultAvailability,
      autoSwitchToSold:
        typeof workflowSettings?.autoSwitchToSold === "boolean"
          ? workflowSettings.autoSwitchToSold
          : defaultWorkflow.autoSwitchToSold,
      rememberBrand:
        typeof workflowSettings?.rememberBrand === "boolean"
          ? workflowSettings.rememberBrand
          : defaultWorkflow.rememberBrand,
      rememberEngine:
        typeof workflowSettings?.rememberEngine === "boolean"
          ? workflowSettings.rememberEngine
          : defaultWorkflow.rememberEngine,
    },
    importExport: {
      conflictBehavior:
        importExportSettings?.conflictBehavior === "preferCloud"
          ? "preferCloud"
          : defaultImportExport.conflictBehavior,
      exportDateFormat:
        importExportSettings?.exportDateFormat === "yyyy-MM-dd"
          ? "yyyy-MM-dd"
          : defaultImportExport.exportDateFormat,
      includeSold:
        typeof importExportSettings?.includeSold === "boolean"
          ? importExportSettings.includeSold
          : defaultImportExport.includeSold,
      includeDeleted:
        typeof importExportSettings?.includeDeleted === "boolean"
          ? importExportSettings.includeDeleted
          : defaultImportExport.includeDeleted,
    },
  };
}

export function useUserPreferences(uid: string) {
  const [preferences, setPreferences] = useState<UserPreferences>(defaultUserPreferences);
  const [isLoading, setIsLoading] = useState(Boolean(uid));

  const db = useMemo(() => getFirestoreDb(), []);

  useEffect(() => {
    if (!uid) return;

    const userRef = doc(db, "users", uid);
    const unsubscribe = onSnapshot(
      userRef,
      (snap) => {
        const data = snap.exists() ? (snap.data() as Record<string, unknown>) : null;
        setPreferences(mapPreferences(data));
        setIsLoading(false);
      },
      () => {
        setIsLoading(false);
      },
    );
    return () => unsubscribe();
  }, [db, uid]);

  const savePreferences = useCallback(
    async (next: Partial<UserPreferences>) => {
      if (!uid) {
        throw new Error("Пользователь не авторизован");
      }
      const userRef = doc(db, "users", uid);
      const payload: Record<string, unknown> = {};
      if (typeof next.syncEnabled === "boolean") {
        payload.accountingSyncEnabled = next.syncEnabled;
      }
      if (typeof next.liveOverviewEnabled === "boolean") {
        payload.accountingLiveOverviewEnabled = next.liveOverviewEnabled;
      }
      if (typeof next.motorSyncEnabled === "boolean") {
        payload.motorSyncEnabled = next.motorSyncEnabled;
      }
      if (
        next.employees !== undefined ||
        next.specifics !== undefined ||
        typeof next.isConfigured === "boolean"
      ) {
        payload.accountingSettings = {
          employees: next.employees ?? preferences.employees,
          specifics: next.specifics ?? preferences.specifics,
          isConfigured: next.isConfigured ?? preferences.isConfigured,
        };
      }
      if (next.workflow) {
        payload.workflowSettings = {
          ...preferences.workflow,
          ...next.workflow,
        };
      }
      if (next.importExport) {
        payload.importExportSettings = {
          ...preferences.importExport,
          ...next.importExport,
        };
      }
      await setDoc(userRef, payload, { merge: true });
    },
    [db, preferences.employees, preferences.importExport, preferences.isConfigured, preferences.specifics, preferences.workflow, uid],
  );

  const updateAccountProfile = useCallback(
    async (payload: { name?: string | null; phone?: string | null }) => {
      await updateAccountProfileRemote(payload);
    },
    [],
  );

  return {
    preferences,
    isLoading,
    savePreferences,
    updateAccountProfile,
  };
}
