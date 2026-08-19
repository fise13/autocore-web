import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import type { CompanyAppConfig } from "@/domain/company-config";
import {
  isInventoryGroupId,
  isInventorySubcategoryId,
  resolveGroupForCategoryName,
  resolveSubcategoryForCategoryName,
} from "@/domain/inventory-taxonomy";
import type { SpecificCategoryEntity } from "@/domain/specific-category";
import { Permission, UserRole, hasPermission } from "@/domain/user";
import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { AccountAccessError } from "@/lib/auth/verify-account-access";
import { normalizeCompanyId } from "@/lib/company-id";
import {
  createDefaultColumnSchema,
  normalizeColumnSchema,
} from "@/lib/specific/specific-category-schema";
import { scopedCategoryDocumentId } from "@/lib/specific/specific-sync-ids";

type EmployeeDoc = {
  role?: UserRole;
  permissions?: Permission[];
  isActive?: boolean;
};

type UserDoc = {
  companyId?: string;
  role?: UserRole;
  permissions?: Permission[];
};

function nextLocalId(existing: Array<{ localId: number }>): number {
  const max = existing.reduce((acc, item) => Math.max(acc, item.localId ?? 0), 0);
  return max + 1;
}

function sanitizeSpecificCategories(
  categories: CompanyAppConfig["specificCategories"],
): Array<Record<string, unknown>> {
  return categories.map(({ id, name, mode, groupId, subcategoryId, warrantyDefault }) => {
    const item: Record<string, unknown> = { id, name, mode, groupId };
    if (subcategoryId) item.subcategoryId = subcategoryId;
    if (warrantyDefault !== undefined) item.warrantyDefault = warrantyDefault;
    return item;
  });
}

export async function verifyCanManageCompanySettings(
  uid: string,
  companyId: string,
): Promise<string> {
  const normalizedCompanyId = normalizeCompanyId(companyId);
  if (!normalizedCompanyId) {
    throw new AccountAccessError("Компания не привязана", 403);
  }

  const db = getAdminFirestore();
  const [companySnap, userSnap, employeeSnap] = await Promise.all([
    db.collection("companies").doc(normalizedCompanyId).get(),
    db.collection("users").doc(uid).get(),
    db.collection("companies").doc(normalizedCompanyId).collection("employees").doc(uid).get(),
  ]);

  if (!companySnap.exists) {
    throw new AccountAccessError("Компания не найдена", 404);
  }

  const isOwner = String(companySnap.data()?.ownerId ?? "") === uid;
  if (isOwner) return normalizedCompanyId;

  const userData = (userSnap.data() ?? {}) as UserDoc;
  const employee = employeeSnap.exists ? (employeeSnap.data() as EmployeeDoc) : null;
  const activeCompanyId = String(userData.companyId ?? "").trim();
  if (normalizeCompanyId(activeCompanyId) !== normalizedCompanyId) {
    throw new AccountAccessError("Компания не привязана", 403);
  }

  const effectiveUser = {
    id: uid,
    email: "",
    displayName: null,
    phone: null,
    photoURL: null,
    role: (employee?.role ?? userData.role ?? "employee") as UserRole,
    companyId: normalizedCompanyId,
    permissions: employee?.permissions ?? userData.permissions ?? [],
    isActive: employee?.isActive ?? true,
    isCompanyOwner: false,
  };

  if (!hasPermission(effectiveUser, "settings_manage")) {
    throw new AccountAccessError("Недостаточно прав для настройки компании", 403);
  }

  return normalizedCompanyId;
}

async function loadSpecificCategoriesAdmin(
  companyId: string,
): Promise<SpecificCategoryEntity[]> {
  const snapshot = await getAdminFirestore()
    .collection("specificCategories")
    .where("companyId", "==", companyId)
    .get();

  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data() as Record<string, unknown>;
    const name = String(data.name ?? "");
    const resolvedSubcategory = resolveSubcategoryForCategoryName(name);
    const groupId = isInventoryGroupId(data.groupId)
      ? data.groupId
      : (resolvedSubcategory?.groupId ?? resolveGroupForCategoryName(name));
    const subcategoryId = isInventorySubcategoryId(data.subcategoryId)
      ? data.subcategoryId
      : resolvedSubcategory?.id;

    return {
      id: docSnap.id,
      localId: Number(data.localId ?? 0),
      name,
      companyId,
      groupId,
      subcategoryId,
      columnSchema: Array.isArray(data.columnSchema)
        ? normalizeColumnSchema(data.columnSchema as SpecificCategoryEntity["columnSchema"])
        : [],
    };
  });
}

async function ensureTrackedCategoryAdmin(
  companyId: string,
  category: CompanyAppConfig["specificCategories"][number],
  existing: SpecificCategoryEntity[],
): Promise<SpecificCategoryEntity[]> {
  const trimmed = category.name.trim();
  if (!trimmed) return existing;

  const resolvedSubcategory = resolveSubcategoryForCategoryName(trimmed);
  const groupId = isInventoryGroupId(category.groupId)
    ? category.groupId
    : (resolvedSubcategory?.groupId ?? resolveGroupForCategoryName(trimmed));
  const subcategoryId = isInventorySubcategoryId(category.subcategoryId)
    ? category.subcategoryId
    : resolvedSubcategory?.id;

  const match = existing.find(
    (item) =>
      item.groupId === groupId &&
      item.name.localeCompare(trimmed, "ru", { sensitivity: "accent" }) === 0,
  );
  if (match) return existing;

  const localId = nextLocalId(existing);
  const docId = scopedCategoryDocumentId(companyId, localId);
  const columnSchema = normalizeColumnSchema(createDefaultColumnSchema());
  const payload: Record<string, unknown> = {
    companyId,
    localId,
    name: trimmed,
    groupId,
    columnSchema,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (subcategoryId) payload.subcategoryId = subcategoryId;

  await getAdminFirestore().collection("specificCategories").doc(docId).set(payload);

  return [
    ...existing,
    {
      id: docId,
      localId,
      name: trimmed,
      companyId,
      groupId,
      subcategoryId,
      columnSchema,
    },
  ];
}

export async function completeCompanySetupAsAdmin(
  uid: string,
  companyId: string,
  config: CompanyAppConfig,
): Promise<CompanyAppConfig> {
  const normalizedCompanyId = await verifyCanManageCompanySettings(uid, companyId);
  const finalConfig: CompanyAppConfig = {
    ...config,
    onboardingCompleted: true,
  };

  const appPayload: Record<string, unknown> = {
    onboardingCompleted: true,
    businessImportCompleted: Boolean(finalConfig.businessImportCompleted),
    modules: finalConfig.modules,
    specificCategories: sanitizeSpecificCategories(finalConfig.specificCategories),
    defaultWarrantyTemplate: finalConfig.defaultWarrantyTemplate,
    updatedByUserId: uid,
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (typeof finalConfig.taxonomyVersion === "number") {
    appPayload.taxonomyVersion = finalConfig.taxonomyVersion;
  }
  if (finalConfig.displayCurrency) {
    appPayload.displayCurrency = finalConfig.displayCurrency;
  }

  const db = getAdminFirestore();
  await db
    .collection("companies")
    .doc(normalizedCompanyId)
    .collection("settings")
    .doc("app")
    .set(appPayload, { merge: true });

  let existing = await loadSpecificCategoriesAdmin(normalizedCompanyId);
  for (const category of finalConfig.specificCategories.filter((item) => item.mode === "tracked")) {
    existing = await ensureTrackedCategoryAdmin(normalizedCompanyId, category, existing);
  }

  return finalConfig;
}
