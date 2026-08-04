import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import type { UserRole } from "@/domain/user";
import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { normalizeCompanyId } from "@/lib/company-id";
import {
  emitMemberAccessSuspendedNotification,
  emitMemberRemovedFromCompanyNotification,
} from "@/lib/notifications/team-events.server";
import { OrgError } from "@autocore/org";

const COMPANIES = "companies";

async function getCompanyName(companyId: string): Promise<string> {
  const snap = await getAdminFirestore().collection(COMPANIES).doc(companyId).get();
  return String(snap.data()?.name ?? "компании").trim() || "компании";
}

async function appendEmployeeActivityLog(
  companyId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    await getAdminFirestore()
      .collection(COMPANIES)
      .doc(companyId)
      .collection("activityLogs")
      .add({
        companyId,
        module: "employees",
        severity: "info",
        timestamp: FieldValue.serverTimestamp(),
        ...payload,
      });
  } catch {
    // Best-effort logging.
  }
}

async function switchUserActiveCompany(
  userId: string,
  removedCompanyId: string,
): Promise<string | null> {
  const db = getAdminFirestore();
  const userRef = db.collection("users").doc(userId);
  const userSnap = await userRef.get();
  const activeCompanyId = normalizeCompanyId(String(userSnap.data()?.companyId ?? ""));

  if (activeCompanyId !== removedCompanyId) {
    return activeCompanyId || null;
  }

  const membershipsSnap = await userRef.collection("memberships").get();
  const nextCompanyId = membershipsSnap.docs[0]?.id ?? null;

  await userRef.set(
    {
      companyId: nextCompanyId ?? "",
      isActive: true,
      ...(nextCompanyId
        ? {}
        : { role: "employee", permissions: [] }),
    },
    { merge: true },
  );

  return nextCompanyId;
}

export async function removeMemberFromCompanyAsAdmin(params: {
  actorUserId: string;
  companyId: string;
  targetUserId: string;
}): Promise<{ nextCompanyId: string | null }> {
  const companyId = normalizeCompanyId(params.companyId);
  const targetUserId = params.targetUserId.trim();
  if (!companyId || !targetUserId) {
    throw new OrgError("permission_denied", 400);
  }
  if (targetUserId === params.actorUserId) {
    throw new OrgError("permission_denied", 403);
  }

  const db = getAdminFirestore();
  const companyRef = db.collection(COMPANIES).doc(companyId);
  const companySnap = await companyRef.get();
  if (!companySnap.exists) throw new OrgError("org_not_found", 404);

  const ownerId = String(companySnap.data()?.ownerId ?? "");
  const employeeRef = companyRef.collection("employees").doc(targetUserId);
  const employeeSnap = await employeeRef.get();
  if (!employeeSnap.exists) throw new OrgError("not_a_member", 404);

  const employeeRole = String(employeeSnap.data()?.role ?? "");
  if (employeeRole === "owner" || ownerId === targetUserId) {
    const ownersSnap = await companyRef
      .collection("employees")
      .where("role", "==", "owner")
      .where("isActive", "==", true)
      .get();
    const otherOwners = ownersSnap.docs.filter((doc) => doc.id !== targetUserId);
    if (otherOwners.length === 0) {
      throw new OrgError("sole_owner_cannot_leave", 409);
    }
  }

  const companyName = String(companySnap.data()?.name ?? "компании").trim() || "компании";
  const targetName = String(employeeSnap.data()?.fullName ?? employeeSnap.data()?.email ?? "Сотрудник");

  await employeeRef.delete();
  await db.collection("users").doc(targetUserId).collection("memberships").doc(companyId).delete();

  const nextCompanyId = await switchUserActiveCompany(targetUserId, companyId);

  await appendEmployeeActivityLog(companyId, {
    action: "employee.removed",
    actor: params.actorUserId,
    target: `employee:${targetUserId}`,
    targetId: targetUserId,
    targetName,
  });

  await emitMemberRemovedFromCompanyNotification({
    companyId,
    companyName,
    targetUserId,
    actorUserId: params.actorUserId,
  });

  return { nextCompanyId };
}

/** Current company owner hands ownership to another active employee, then can leave. */
export async function transferOwnershipAsOwner(params: {
  actorUserId: string;
  companyId: string;
  newOwnerUserId: string;
}): Promise<void> {
  const companyId = normalizeCompanyId(params.companyId);
  const newOwnerUserId = params.newOwnerUserId.trim();
  if (!companyId || !newOwnerUserId) {
    throw new OrgError("permission_denied", 400);
  }
  if (newOwnerUserId === params.actorUserId) {
    throw new OrgError("permission_denied", 400);
  }

  const db = getAdminFirestore();
  const companyRef = db.collection(COMPANIES).doc(companyId);
  const companySnap = await companyRef.get();
  if (!companySnap.exists) throw new OrgError("org_not_found", 404);

  const ownerId = String(companySnap.data()?.ownerId ?? "");
  if (ownerId !== params.actorUserId) {
    throw new OrgError("permission_denied", 403);
  }

  const newOwnerRef = companyRef.collection("employees").doc(newOwnerUserId);
  const actorRef = companyRef.collection("employees").doc(params.actorUserId);
  const [newOwnerSnap, actorSnap] = await Promise.all([newOwnerRef.get(), actorRef.get()]);
  if (!newOwnerSnap.exists || newOwnerSnap.data()?.isActive === false) {
    throw new OrgError("not_a_member", 404);
  }
  if (!actorSnap.exists) throw new OrgError("not_a_member", 404);

  const companyName = String(companySnap.data()?.name ?? "").trim() || companyId;
  const batch = db.batch();
  batch.update(companyRef, {
    ownerId: newOwnerUserId,
    updatedAt: FieldValue.serverTimestamp(),
  });
  batch.set(
    newOwnerRef,
    { role: "owner", permissions: [], updatedAt: FieldValue.serverTimestamp() },
    { merge: true },
  );
  batch.set(
    actorRef,
    { role: "admin", updatedAt: FieldValue.serverTimestamp() },
    { merge: true },
  );
  batch.set(
    db.collection("users").doc(newOwnerUserId).collection("memberships").doc(companyId),
    { companyId, name: companyName, role: "owner", updatedAt: FieldValue.serverTimestamp() },
    { merge: true },
  );
  batch.set(
    db.collection("users").doc(params.actorUserId).collection("memberships").doc(companyId),
    { companyId, name: companyName, role: "admin", updatedAt: FieldValue.serverTimestamp() },
    { merge: true },
  );

  const newOwnerUserSnap = await db.collection("users").doc(newOwnerUserId).get();
  const newOwnerActiveCompany = String(newOwnerUserSnap.data()?.companyId ?? "").trim();
  if (!newOwnerActiveCompany || newOwnerActiveCompany === "default") {
    batch.set(
      db.collection("users").doc(newOwnerUserId),
      { companyId, role: "owner", permissions: [], isActive: true },
      { merge: true },
    );
  } else {
    batch.set(db.collection("users").doc(newOwnerUserId), { role: "owner" }, { merge: true });
  }

  const actorUserSnap = await db.collection("users").doc(params.actorUserId).get();
  const actorActiveCompany = String(actorUserSnap.data()?.companyId ?? "").trim();
  if (actorActiveCompany === companyId) {
    batch.set(db.collection("users").doc(params.actorUserId), { role: "admin" }, { merge: true });
  }

  await batch.commit();

  await appendEmployeeActivityLog(companyId, {
    action: "employee.ownership_transferred",
    actor: params.actorUserId,
    target: `employee:${newOwnerUserId}`,
    targetId: newOwnerUserId,
  });
}

export async function setMemberActiveAsAdmin(params: {
  actorUserId: string;
  companyId: string;
  targetUserId: string;
  isActive: boolean;
}): Promise<void> {
  const companyId = normalizeCompanyId(params.companyId);
  const targetUserId = params.targetUserId.trim();
  if (!companyId || !targetUserId) {
    throw new OrgError("permission_denied", 400);
  }
  if (targetUserId === params.actorUserId) {
    throw new OrgError("permission_denied", 403);
  }

  const db = getAdminFirestore();
  const companyRef = db.collection(COMPANIES).doc(companyId);
  const employeeRef = companyRef.collection("employees").doc(targetUserId);
  const [companySnap, employeeSnap] = await Promise.all([companyRef.get(), employeeRef.get()]);
  if (!employeeSnap.exists) throw new OrgError("not_a_member", 404);

  const ownerId = String(companySnap.data()?.ownerId ?? "");
  const employeeRole = String(employeeSnap.data()?.role ?? "");
  if (!params.isActive && (employeeRole === "owner" || ownerId === targetUserId)) {
    throw new OrgError("sole_owner_cannot_leave", 409);
  }

  const companyName = await getCompanyName(companyId);
  const targetName = String(employeeSnap.data()?.fullName ?? employeeSnap.data()?.email ?? "Сотрудник");

  await employeeRef.set(
    {
      isActive: params.isActive,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  const userRef = db.collection("users").doc(targetUserId);
  const userSnap = await userRef.get();
  const activeCompanyId = normalizeCompanyId(String(userSnap.data()?.companyId ?? ""));
  if (activeCompanyId === companyId) {
    await userRef.set({ isActive: params.isActive }, { merge: true });
  }

  await appendEmployeeActivityLog(companyId, {
    action: params.isActive ? "employee.activated" : "employee.deactivated",
    actor: params.actorUserId,
    target: `employee:${targetUserId}`,
    targetId: targetUserId,
    targetName,
    severity: params.isActive ? "info" : "warning",
  });

  if (!params.isActive) {
    await emitMemberAccessSuspendedNotification({
      companyId,
      companyName,
      targetUserId,
      actorUserId: params.actorUserId,
    });
  }
}
