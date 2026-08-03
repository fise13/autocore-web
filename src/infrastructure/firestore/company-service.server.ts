import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { ROLE_PERMISSIONS, UserRole } from "@/domain/user";
import { getAdminAuth, getAdminFirestore } from "@/infrastructure/firebase/admin";
import { ensureDefaultWarehouseAdmin } from "@/lib/warehouse/ensure-default-warehouse.server";

export async function createCompanyAsAdmin(
  ownerId: string,
  name: string,
  options?: { switchActive?: boolean },
): Promise<string> {
  const db = getAdminFirestore();
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error("Enter a company name");
  }

  const userSnap = await db.collection("users").doc(ownerId).get();
  const previousCompanyId = String(userSnap.data()?.companyId ?? "").trim();

  const companyRef = db.collection("companies").doc();
  const companyId = companyRef.id;

  await companyRef.set({
    name: trimmedName,
    ownerId,
    createdAt: FieldValue.serverTimestamp(),
  });

  await Promise.all(
    (Object.keys(ROLE_PERMISSIONS) as UserRole[]).map((role) =>
      companyRef.collection("roles").doc(role).set(
        {
          companyId,
          role,
          permissions: ROLE_PERMISSIONS[role],
          isSystem: true,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      ),
    ),
  );

  const authUser = await getAdminAuth().getUser(ownerId);
  const userData = userSnap.data() ?? {};
  const email = String(userData.email ?? authUser.email ?? "");
  const fullName = String(userData.name ?? authUser.displayName ?? "");

  await companyRef.collection("employees").doc(ownerId).set(
    {
      uid: ownerId,
      companyId,
      email,
      fullName,
      role: "owner",
      permissions: [],
      invitedBy: ownerId,
      isActive: true,
      createdAt: FieldValue.serverTimestamp(),
      lastActiveAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  await db.collection("users").doc(ownerId).set(
    {
      ...(options?.switchActive === false && previousCompanyId
        ? {}
        : {
            companyId,
            role: "owner",
            permissions: [],
            isActive: true,
          }),
      ...(email ? { email } : {}),
      ...(fullName ? { name: fullName } : {}),
    },
    { merge: true },
  );

  await db
    .collection("users")
    .doc(ownerId)
    .collection("memberships")
    .doc(companyId)
    .set(
      {
        companyId,
        role: "owner",
        name: trimmedName,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

  if (previousCompanyId && previousCompanyId !== companyId) {
    const previousCompanySnap = await db.collection("companies").doc(previousCompanyId).get();
    const previousRole =
      String(previousCompanySnap.data()?.ownerId ?? "") === ownerId ? "owner" : "employee";
    await db
      .collection("users")
      .doc(ownerId)
      .collection("memberships")
      .doc(previousCompanyId)
      .set(
        {
          companyId: previousCompanyId,
          role: previousRole,
          name: String(previousCompanySnap.data()?.name ?? previousCompanyId),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
  }

  const billingRef = companyRef.collection("billing").doc("subscription");
  const billingSnap = await billingRef.get();
  if (!billingSnap.exists) {
    await billingRef.set({
      plan: "free",
      status: "active",
      proActive: false,
      provider: "internal",
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  // Consumables workspace: main warehouse + расходники categories.
  try {
    await ensureDefaultWarehouseAdmin(companyId);
  } catch (error) {
    console.warn("[createCompanyAsAdmin] default warehouse skipped:", error);
  }

  return companyId;
}
