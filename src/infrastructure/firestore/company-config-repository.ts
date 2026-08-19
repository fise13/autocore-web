import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";

import {
  CompanyAppConfig,
  CompanyModuleKey,
  CompanySpecificCategoryConfig,
  defaultCompanyAppConfig,
} from "@/domain/company-config";
import { WarrantyTemplateId } from "@/domain/document-config";
import { mergeKnowledgeFlags } from "@/domain/knowledge/flags";
import type { KnowledgeFlags } from "@/domain/knowledge/types";
import {
  isInventoryGroupId,
  isInventorySubcategoryId,
  resolveGroupForCategoryName,
  resolveSubcategoryForCategoryName,
} from "@/domain/inventory-taxonomy";
import { toDateFromFirestore } from "@/lib/firestore-timestamp";
import { getFirestoreDb } from "@/infrastructure/firebase/client";
import {
  normalizeAppDisplayCurrency,
  type AppDisplayCurrency,
} from "@/lib/money/display-currency";

const MODULE_KEYS: CompanyModuleKey[] = [
  "motors",
  "workOrders",
  "accounting",
  "warehouse",
  "specifics",
];

function sanitizeSpecificCategories(
  categories: CompanyAppConfig["specificCategories"],
): Array<Record<string, unknown>> {
  return categories.map(({ id, name, mode, groupId, subcategoryId, warrantyDefault }) => {
    const item: Record<string, unknown> = { id, name, mode, groupId };
    if (subcategoryId) {
      item.subcategoryId = subcategoryId;
    }
    if (warrantyDefault !== undefined) {
      item.warrantyDefault = warrantyDefault;
    }
    return item;
  });
}

function mapSpecificCategory(raw: unknown): CompanySpecificCategoryConfig | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  const id = String(data.id ?? "").trim();
  const name = String(data.name ?? "").trim();
  if (!id || !name) return null;
  const mode = data.mode === "quick" ? "quick" : "tracked";
  const resolvedSubcategory = resolveSubcategoryForCategoryName(name);
  const groupId = isInventoryGroupId(data.groupId)
    ? data.groupId
    : (resolvedSubcategory?.groupId ?? resolveGroupForCategoryName(name));
  const subcategoryId = isInventorySubcategoryId(data.subcategoryId)
    ? data.subcategoryId
    : resolvedSubcategory?.id;
  const warrantyDefault =
    data.warrantyDefault === "none" ||
    (typeof data.warrantyDefault === "string" && data.warrantyDefault.startsWith("contract_"))
      ? (data.warrantyDefault as WarrantyTemplateId | "none")
      : undefined;
  const category: CompanySpecificCategoryConfig = { id, name, mode, groupId };
  if (subcategoryId) category.subcategoryId = subcategoryId;
  if (warrantyDefault !== undefined) category.warrantyDefault = warrantyDefault;
  return category;
}

function mapCompanyAppConfig(data: Record<string, unknown> | undefined): CompanyAppConfig {
  const fallback = defaultCompanyAppConfig();
  if (!data) return fallback;

  const modulesRaw = (data.modules ?? {}) as Record<string, unknown>;
  const modules = { ...fallback.modules };
  for (const key of MODULE_KEYS) {
    if (typeof modulesRaw[key] === "boolean") {
      modules[key] = modulesRaw[key] as boolean;
    }
  }

  const specificCategories = Array.isArray(data.specificCategories)
    ? data.specificCategories
        .map(mapSpecificCategory)
        .filter((item): item is CompanySpecificCategoryConfig => item != null)
    : fallback.specificCategories;

  const defaultWarrantyTemplate =
    data.defaultWarrantyTemplate === "no_warranty" ||
    (typeof data.defaultWarrantyTemplate === "string" &&
      data.defaultWarrantyTemplate.startsWith("contract_")) ||
    data.defaultWarrantyTemplate === "custom"
      ? (data.defaultWarrantyTemplate as CompanyAppConfig["defaultWarrantyTemplate"])
      : fallback.defaultWarrantyTemplate;

  return {
    onboardingCompleted: Boolean(data.onboardingCompleted ?? false),
    businessImportCompleted: Boolean(data.businessImportCompleted ?? false),
    modules,
    specificCategories,
    defaultWarrantyTemplate,
    taxonomyVersion: typeof data.taxonomyVersion === "number" ? data.taxonomyVersion : undefined,
    knowledge: mergeKnowledgeFlags(data.knowledge as KnowledgeFlags | undefined),
    displayCurrency: normalizeAppDisplayCurrency(data.displayCurrency),
    updatedAt: toDateFromFirestore(data.updatedAt) ?? undefined,
  };
}

function companyConfigRef(companyId: string) {
  return doc(getFirestoreDb(), "companies", companyId, "settings", "app");
}

export function createCompanyConfigRepository() {
  return {
    subscribeAppConfig(
      companyId: string,
      onData: (config: CompanyAppConfig | null) => void,
      onError?: (error: Error) => void,
    ) {
      if (!companyId) {
        onData(null);
        return () => undefined;
      }
      return onSnapshot(
        companyConfigRef(companyId),
        (snapshot) => {
          onData(
            snapshot.exists()
              ? mapCompanyAppConfig(snapshot.data() as Record<string, unknown>)
              : null,
          );
        },
        (error) => onError?.(error),
      );
    },

    async readAppConfig(companyId: string): Promise<CompanyAppConfig | null> {
      if (!companyId) return null;
      const snap = await getDoc(companyConfigRef(companyId));
      return snap.exists()
        ? mapCompanyAppConfig(snap.data() as Record<string, unknown>)
        : null;
    },

    async saveAppConfig(companyId: string, config: CompanyAppConfig, updatedByUserId: string) {
      const payload: Record<string, unknown> = {
        onboardingCompleted: config.onboardingCompleted,
        businessImportCompleted: Boolean(config.businessImportCompleted),
        modules: config.modules,
        specificCategories: sanitizeSpecificCategories(config.specificCategories),
        defaultWarrantyTemplate: config.defaultWarrantyTemplate,
        knowledge: mergeKnowledgeFlags(config.knowledge),
        displayCurrency: normalizeAppDisplayCurrency(config.displayCurrency),
        updatedByUserId,
        updatedAt: serverTimestamp(),
      };
      if (typeof config.taxonomyVersion === "number") {
        payload.taxonomyVersion = config.taxonomyVersion;
      }
      await setDoc(companyConfigRef(companyId), payload, { merge: true });
    },

    async saveCompanyDisplayCurrency(
      companyId: string,
      displayCurrency: AppDisplayCurrency,
      updatedByUserId: string,
    ) {
      if (!companyId) return;
      await setDoc(
        companyConfigRef(companyId),
        {
          displayCurrency: normalizeAppDisplayCurrency(displayCurrency),
          updatedByUserId,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    },
  };
}
