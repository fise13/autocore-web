/**
 * RBAC migration:
 * - users.role: viewer -> employee
 * - backfill companies/{companyId}/employees/{uid}
 * - seed companies/{companyId}/roles/*
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/service-account.json \
 *   npx tsx scripts/migrate-rbac.ts
 */

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const ROLE_PERMISSIONS = {
  owner: [
    "inventory_view",
    "inventory_edit",
    "inventory_delete",
    "accounting_view",
    "accounting_edit",
    "accounting_delete",
    "employee_manage",
    "employee_view",
    "analytics_view",
    "settings_manage",
    "export_data",
    "import_data",
  ],
  admin: [
    "inventory_view",
    "inventory_edit",
    "inventory_delete",
    "accounting_view",
    "accounting_edit",
    "accounting_delete",
    "employee_manage",
    "employee_view",
    "analytics_view",
    "settings_manage",
    "export_data",
    "import_data",
  ],
  manager: [
    "inventory_view",
    "inventory_edit",
    "accounting_view",
    "employee_view",
    "analytics_view",
    "settings_manage",
    "export_data",
    "import_data",
  ],
  accountant: [
    "inventory_view",
    "accounting_view",
    "accounting_edit",
    "analytics_view",
    "export_data",
    "import_data",
  ],
  employee: ["inventory_view", "accounting_view"],
} as const;

type Role = keyof typeof ROLE_PERMISSIONS;

function normalizeRole(raw: string | undefined): Role {
  if (!raw || raw === "viewer") return "employee";
  if (raw in ROLE_PERMISSIONS) return raw as Role;
  return "employee";
}

async function main() {
  if (getApps().length === 0) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (projectId && clientEmail && privateKey) {
      initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
      });
    } else {
      initializeApp();
    }
  }

  const db = getFirestore();
  const users = await db.collection("users").get();

  let migratedUsers = 0;
  for (const user of users.docs) {
    const data = user.data() as Record<string, unknown>;
    const companyId = String(data.companyId ?? "").trim();
    if (!companyId) continue;

    const role = normalizeRole(String(data.role ?? ""));
    const permissions = Array.isArray(data.permissions) ? data.permissions : [];
    const fullName = String(data.name ?? "");
    const email = String(data.email ?? "");

    const batch = db.batch();
    batch.set(
      user.ref,
      {
        role,
        permissions,
        isActive: data.isActive ?? true,
      },
      { merge: true },
    );

    const employeeRef = db.collection("companies").doc(companyId).collection("employees").doc(user.id);
    batch.set(
      employeeRef,
      {
        uid: user.id,
        companyId,
        email,
        fullName,
        role,
        permissions,
        invitedBy: String(data.createdBy ?? user.id),
        isActive: data.isActive ?? true,
        createdAt: data.createdAt ?? new Date(),
        lastActiveAt: new Date(),
      },
      { merge: true },
    );

    for (const seedRole of Object.keys(ROLE_PERMISSIONS) as Role[]) {
      const roleRef = db.collection("companies").doc(companyId).collection("roles").doc(seedRole);
      batch.set(
        roleRef,
        {
          companyId,
          role: seedRole,
          permissions: ROLE_PERMISSIONS[seedRole],
          isSystem: true,
          updatedAt: new Date(),
        },
        { merge: true },
      );
    }

    await batch.commit();
    migratedUsers += 1;
  }

  console.log(`RBAC migration complete. Migrated users: ${migratedUsers}`);
}

main().catch((error) => {
  console.error("RBAC migration failed", error);
  process.exit(1);
});

